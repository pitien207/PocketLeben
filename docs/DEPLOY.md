# Triển khai Pocket Leben lên Azure (Container Apps + Cosmos DB)

Game có server (tài khoản, save trên mây, multiplayer qua WebSocket) nên chạy trên Azure Container Apps, dữ liệu
trong Cosmos DB for MongoDB. Bộ tài nguyên **pocketleben-*** được dựng lại từ đầu ở 1.31 (bỏ bộ `visahunter-*` cũ
khi chưa có người chơi).

```
git push main ──► GitHub Actions (.github/workflows/deploy.yml)
                    ├─ docker build (npm ci + typecheck + vite build, server deps)
                    ├─ push ghcr.io/pitien207/pocket-leben:<sha>
                    └─ az containerapp update (đăng nhập Azure bằng OIDC, không có mật khẩu)
                                   │
Azure  pocketleben-rg ─ pocketleben-env ─ Container App "pocket-leben" (Node 24, cổng 8080, 0–1 bản sao)
                      │                   │  MONGO_URI (secret "mongo-uri"), MONGO_DB=pocketleben, GOOGLE_CLIENT_ID
                      └─ pocketleben-cosmos (Cosmos DB, API MongoDB 7.0, gói Free) ─ database "pocketleben"
```

## Tài nguyên

| Thứ | Giá trị |
|---|---|
| Resource group | `pocketleben-rg` (Germany West Central) |
| Container Apps environment | `pocketleben-env` (Consumption, không gửi log → không tốn Log Analytics) |
| Container App | `pocket-leben`, 0.25 vCPU / 0.5 GiB, **min 0 – max 1 bản sao** |
| Địa chỉ | **https://pocketleben.nghiapham.org** (chứng chỉ managed miễn phí; DNS ở Cloudflare, CNAME để *DNS only*) — dự phòng: địa chỉ `…azurecontainerapps.io` của app |
| Database | `pocketleben-cosmos` — Cosmos DB for MongoDB (RU), **free tier** (1000 RU/s + 25 GB miễn phí). Database `pocketleben` (1000 RU/s dùng chung), collections `users`, `tokens`, `saves`, … |
| GitHub → Azure | app registration `github-pocketleben-deploy` (OIDC, chỉ nhánh `main` của `pitien207/PocketLeben`, subject `repo:pitien207@208530485/PocketLeben@1449784608:ref:refs/heads/main`), quyền **Container Apps Contributor** trên `pocketleben-rg` |
| GitHub secrets / variables | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, biến `AZURE_RESOURCE_GROUP=pocketleben-rg` |

**Max 1 bản sao là bắt buộc**: các phòng multiplayer nằm trong bộ nhớ của một tiến trình. Khi không ai chơi, app
scale về 0 (gần như miễn phí); người đầu tiên vào sẽ chờ vài giây để app khởi động.

Pocket Leben tách hẳn khỏi lofitalk (`lofitalk-rg`): không dùng chung, không đụng tới tài nguyên của nó.

## Dựng lại từ đầu (1.31: xoá bộ visahunter-*, tạo bộ pocketleben-*)

Các lệnh viết cho **PowerShell** (`$bien = …`), chạy hết trong **một** cửa sổ. Chuỗi kết nối Cosmos chứa `&`: khi
PowerShell gọi `az` (là file `az.cmd`), `&` bị hiểu là "lệnh tiếp theo" và lệnh bị cắt — vì vậy giá trị được bọc thêm
một cặp ngoặc kép (`` `" `` là dấu " trong chuỗi PowerShell), xem bước 3. Subscription `af92c830-…`, tenant `163a6f22-…` giữ nguyên.

### 1. Xoá bộ cũ
```powershell
az group delete -n visahunter-rg --yes          # xoá Container App, environment và Cosmos cũ (~10 phút, chờ xong)
az ad app delete --id e833b26a-a703-47c0-bc65-3afa9bce0270   # app registration github-visahunter-deploy
```
- Cloudflare (DNS của `nghiapham.org`): xoá bản ghi CNAME `visahunter` và TXT `asuid.visahunter`.
- Phải chờ `az group delete` chạy xong rồi mới tạo Cosmos mới: mỗi subscription chỉ có **một** tài khoản Cosmos free tier.
- Image cũ `ghcr.io/pitien207/visa-hunter` để lại tới khi bản deploy mới chạy (bước 3 dùng nó làm image tạm), sau đó
  xoá ở GitHub → Your profile → Packages → `visa-hunter` → Package settings → Delete this package.

### 2. Database
```powershell
az group create -n pocketleben-rg -l germanywestcentral
az cosmosdb create -n pocketleben-cosmos -g pocketleben-rg --kind MongoDB --server-version 7.0 --enable-free-tier true `
  --default-consistency-level Session --locations regionName=germanywestcentral failoverPriority=0 isZoneRedundant=false
az cosmosdb mongodb database create -a pocketleben-cosmos -g pocketleben-rg -n pocketleben --throughput 1000
```
**Kiểm tra phiên bản** (phải là `7.0`; có bản Azure CLI bỏ qua `--server-version` và tạo 3.6 — driver MongoDB của server
không nói chuyện được với 3.6, app sẽ báo Unhealthy):
```powershell
az cosmosdb show -n pocketleben-cosmos -g pocketleben-rg --query apiProperties.serverVersion -o tsv
az cosmosdb update -n pocketleben-cosmos -g pocketleben-rg --server-version 7.0   # nếu ra 3.6
```
**Kiểm tra throughput dùng chung** (phải ra `1000`). Nếu báo `NotFound` thì database đang không có throughput chung
(ví dụ app đã tự tạo nó trước lệnh trên): khi đó mỗi collection tự lấy 400 RU/s riêng, tới collection thứ 3 thì vượt
giới hạn 1000 của tài khoản → đăng ký báo lỗi "server" (log: `total throughput limit of 1000 RU/s`). Sửa = xoá database
(lúc chưa có người chơi) rồi tạo lại bằng lệnh trên, sau đó restart revision của Container App:
```powershell
az cosmosdb mongodb database throughput show -a pocketleben-cosmos -g pocketleben-rg -n pocketleben --query resource.throughput -o tsv
```
Không tăng throughput quá 1000 RU/s (phần vượt sẽ tính tiền). Chỉ index TTL trên `_ts` được phép trong Cosmos (RU),
nên token hết hạn được kiểm tra trong code (`server/store.mjs`).

### 3. Container App
```powershell
az containerapp env create -n pocketleben-env -g pocketleben-rg -l germanywestcentral --logs-destination none
$uri = az cosmosdb keys list -n pocketleben-cosmos -g pocketleben-rg --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
az containerapp create -n pocket-leben -g pocketleben-rg --environment pocketleben-env `
  --image ghcr.io/pitien207/visa-hunter:latest --target-port 8080 --ingress external `
  --cpu 0.25 --memory 0.5Gi --min-replicas 0 --max-replicas 1 `
  --secrets "`"mongo-uri=$uri`"" `
  --env-vars MONGO_URI=secretref:mongo-uri MONGO_DB=pocketleben GOOGLE_CLIENT_ID=260353479369-cg476nlo68hvl5ssrgl2goevjesg90ag.apps.googleusercontent.com `
  --query properties.configuration.ingress.fqdn -o tsv
```
Lệnh cuối in ra địa chỉ `pocket-leben.<…>.germanywestcentral.azurecontainerapps.io`. Kiểm tra
`https://<địa chỉ đó>/api/health` → `{"ok":true,"store":"mongodb",…}`. (Image tạm là bản cũ; lần push đầu thay bằng
`ghcr.io/pitien207/pocket-leben`.)

### 4. Cho GitHub Actions deploy (OIDC, không mật khẩu)
Tạo file `cred.json`:
```json
{
  "name": "github-pocketleben-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:pitien207@208530485/PocketLeben@1449784608:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
```
```powershell
$app = az ad app create --display-name github-pocketleben-deploy --query appId -o tsv
az ad sp create --id $app
az ad app federated-credential create --id $app --parameters cred.json
$rg = az group show -n pocketleben-rg --query id -o tsv
az role assignment create --assignee $app --role "Container Apps Contributor" --scope $rg
gh secret set AZURE_CLIENT_ID -b $app -R pitien207/PocketLeben
gh variable set AZURE_RESOURCE_GROUP -b pocketleben-rg -R pitien207/PocketLeben
```
`AZURE_TENANT_ID` và `AZURE_SUBSCRIPTION_ID` không đổi. (Nếu `role assignment create` báo không tìm thấy principal,
đợi 1–2 phút rồi chạy lại.)

### 5. Tên miền `pocketleben.nghiapham.org`
```powershell
az containerapp show -n pocket-leben -g pocketleben-rg --query "[properties.configuration.ingress.fqdn, properties.customDomainVerificationId]" -o tsv
```
Cloudflare → DNS của `nghiapham.org`:

| Loại | Tên | Giá trị | Proxy |
|---|---|---|---|
| CNAME | `pocketleben` | địa chỉ `…azurecontainerapps.io` (dòng 1 ở trên) | **DNS only** (mây xám) |
| TXT | `asuid.pocketleben` | mã xác minh (dòng 2 ở trên) | — |

Đợi vài phút rồi gắn domain + chứng chỉ miễn phí (5–20 phút):
```powershell
az containerapp hostname add  -n pocket-leben -g pocketleben-rg --hostname pocketleben.nghiapham.org
az containerapp hostname bind -n pocket-leben -g pocketleben-rg --hostname pocketleben.nghiapham.org --environment pocketleben-env --validation-method CNAME
```

### 6. Đăng nhập Google
Google Cloud Console → APIs & Services → Clients → client Web của game → *Authorized JavaScript origins*: thêm
`https://pocketleben.nghiapham.org` và địa chỉ `…azurecontainerapps.io` mới; xoá hai origin `visahunter…` cũ; giữ
`http://localhost:5173`. Ở *Branding* đổi tên app thành **Pocket Leben**. Client ID giữ nguyên (đã đặt ở bước 3).

Tạo client mới từ đầu (nếu cần): *OAuth consent screen* → External → Publish app (chỉ `openid email profile`, không
cần Google duyệt); *Clients → Create client* → Web application với các origin trên, không cần Redirect URI, không cần
client secret; rồi `az containerapp update -n pocket-leben -g pocketleben-rg --set-env-vars GOOGLE_CLIENT_ID=<client id>`.
Chạy local: `GOOGLE_CLIENT_ID=<client id> npm run server`.

### 7. Lần deploy đầu
- Push lên `main` → workflow build và đẩy `ghcr.io/pitien207/pocket-leben` lần đầu. Package mới mặc định **private**:
  GitHub → Your profile → Packages → `pocket-leben` → Package settings → *Change visibility* → **Public**, rồi
  *Re-run failed jobs* nếu bước deploy lỗi vì không kéo được image.
- Kiểm tra `https://pocketleben.nghiapham.org/api/health`, rồi xoá package cũ `visa-hunter` (bước 1).

## Băng thông
- Build tạo sẵn bản nén `.br`/`.gz` cho mọi file chữ; server gửi bản nhỏ nhất (lần đầu ~1,15 MB thay vì ~4,2 MB).
- `assets/` có hash trong tên → cache 1 năm; file khác có ETag → không đổi thì trả 304, không tốn dữ liệu.
- Service worker lưu cả game trên máy; bản mới chỉ tải file thay đổi (three.js, physics, React lấy lại từ cache cũ).

## Cập nhật khi đang có người chơi (1.42)
Push lên `main` → image mới → Azure thay container. Chuyện gì xảy ra với người đang chơi:

| Lúc | Điều xảy ra | Game xử lý thế nào |
|---|---|---|
| Container cũ tắt | WebSocket đóng (mã 1012 khi tắt êm, SIGTERM) · phòng online, trận pickleball online mất (chỉ nằm trong RAM) | Toast "Máy chủ đang cập nhật…", **vẫn chơi tiếp offline**; tự nối lại (độ trễ có ±40 % ngẫu nhiên để không ai cũng ập vào cùng giây); trận pickleball online kết thúc "đối thủ mất kết nối" thay vì treo |
| Container mới chạy | 'welcome' báo phiên bản máy chủ (`dist/version.json`) | Khác phiên bản đang chạy → nút **"Có bản cập nhật mới · Tải lại"** dưới la bàn; game **tự lưu + tải lại khi người chơi chuyển app/tab ra nền**; ở màn hình tiêu đề thì tải lại ngay |
| Service worker | Trình duyệt kiểm tra `sw.js` khi mở trang, khi quay lại app và mỗi 20 phút → tải bản mới ngầm, chỉ file đổi tên (hash) | Giữ lại **cache của bản trước** (tab cũ vẫn mở được cảnh chưa tải); chỉ xoá bản cũ hơn nữa |
| Tab cũ xin file đã bị xoá | Server trả **404** cho `/assets/…` không còn (trước đây trả index.html → service worker có thể cache nhầm HTML thành JS) | Mọi import động (boot, cảnh, hiệu ứng) bọc bởi `chunk()` → **lưu game + tải lại vào bản mới** (có chặn lặp 60 s) |
| Bản lưu | localStorage + cloud, có `version` | Cảnh không còn → về phố; vật phẩm không còn → bỏ qua (không vỡ túi đồ) |

Lưu ý:
- Đổi giao thức WebSocket thì **giữ tương thích ngược** ít nhất một bản (client cũ còn chạy tới khi người chơi tải lại) —
  ví dụ 1.42: snapshot không có `outfit` = "giữ bộ cũ", client cũ vẫn gửi đủ.
- Khuyên dùng **`--min-replicas 1 --max-replicas 1`** (một bản luôn chạy): không bị "ngủ" khi vắng người (lần vào đầu tiên
  chậm vài giây, mất phòng online), và phòng online chỉ nằm ở một container. Tốn thêm ít tiền (0,25 vCPU chạy liên tục).
  Lệnh (bạn tự chạy khi muốn): `az containerapp update -n pocket-leben -g pocketleben-rg --min-replicas 1 --max-replicas 1`.
- Bản 1.41 đang chạy trên máy người chơi **chưa có** các lớp bảo vệ này; từ 1.42 trở đi mới có (lần cập nhật lên 1.42 vẫn
  có thể làm tab 1.41 đang mở kẹt ở màn hình tải — người chơi tải lại trang là xong).
- Test giả lập deploy: scratchpad `v142e.mjs` (build A → server đổi sang build B → tab cũ bấm Chơi) + `dbg4.mjs`.

## Hằng ngày
- `git push` lên `main` → khoảng 3–4 phút sau bản mới chạy trên Azure (xem tab *Actions*).
- Quay về bản cũ: `az containerapp update -n pocket-leben -g pocketleben-rg --image ghcr.io/pitien207/pocket-leben:<sha cũ>`
  (workflow giữ 10 image gần nhất).
- Xem log trực tiếp: `az containerapp logs show -n pocket-leben -g pocketleben-rg --follow`.
- Đổi connection string (vd. sau khi xoay khoá):
  ```powershell
  $uri = az cosmosdb keys list -n pocketleben-cosmos -g pocketleben-rg --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
  az containerapp secret set -n pocket-leben -g pocketleben-rg --secrets "`"mongo-uri=$uri`""
  az containerapp revision restart -n pocket-leben -g pocketleben-rg --revision (az containerapp show -n pocket-leben -g pocketleben-rg --query properties.latestRevisionName -o tsv)
  ```
- Chạy giống production trên máy: `npm run build && npm start` (http://localhost:8787; thêm `MONGO_URI=…` để dùng DB).

## Chi phí ước tính
- Container Apps Consumption: mỗi tháng miễn phí 180.000 vCPU-giây + 360.000 GiB-giây — với 0.25 vCPU, app chạy
  liên tục khoảng 200 giờ/tháng vẫn trong mức miễn phí; scale về 0 khi vắng người.
- Cosmos DB free tier: 1000 RU/s + 25 GB miễn phí (database đặt đúng 1000 RU/s dùng chung — đừng tăng).
- ghcr.io: miễn phí cho package public.

### Vì sao Cosmos DB chứ không phải DocumentDB?
Gói Free của **Azure DocumentDB** (mongoClusters) chỉ cho **một cụm mỗi subscription** — suất đó đang là `lofitalk-db`.
Gói Free của **Cosmos DB** là suất riêng (một tài khoản free mỗi subscription). Cả hai đều nói giao thức MongoDB, server
dùng chung code (`server/store.mjs`).
