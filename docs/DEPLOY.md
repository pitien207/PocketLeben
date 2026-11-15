# Triển khai Visa Hunter lên Azure (Container Apps + Cosmos DB)

Từ 1.7.0 game có server (tài khoản, save trên mây, multiplayer qua WebSocket), nên **không** dùng Static Web Apps
nữa (không chạy được server WebSocket). Cách triển khai giống dự án lofitalk:

```
git push main ──► GitHub Actions (.github/workflows/deploy.yml)
                    ├─ docker build (npm ci + typecheck + vite build, server deps)
                    ├─ push ghcr.io/pitien207/visa-hunter:<sha>
                    └─ az containerapp update (đăng nhập Azure bằng OIDC, không có mật khẩu)
                                   │
Azure  visahunter-rg ─ visahunter-env ─ Container App "visa-hunter" (Node 24, cổng 8080, 0–1 bản sao)
                     │                  │  MONGO_URI (secret "mongo-uri")
                     └─ visahunter-cosmos (Cosmos DB, API MongoDB 7.0, gói Free) ─ database "visahunter"
```

## Tài nguyên đã tạo (2026-11-15)

| Thứ | Giá trị |
|---|---|
| Resource group | `visahunter-rg` (Germany West Central) |
| Container Apps environment | `visahunter-env` (Consumption, không gửi log → không tốn Log Analytics) |
| Container App | `visa-hunter`, 0.25 vCPU / 0.5 GiB, **min 0 – max 1 bản sao** |
| Địa chỉ | **https://visahunter.nghiapham.org** (chứng chỉ managed miễn phí, Azure tự gia hạn; DNS ở Cloudflare, CNAME để *DNS only*) — dự phòng: https://visa-hunter.blackisland-f796aa91.germanywestcentral.azurecontainerapps.io |
| Database | `visahunter-cosmos` — Azure Cosmos DB for MongoDB (RU), **free tier** (1000 RU/s + 25 GB miễn phí), Germany West Central. Database `visahunter` (1000 RU/s dùng chung), collections `users`, `tokens`, `saves` |
| GitHub → Azure | app registration `github-visahunter-deploy` (OIDC, chỉ nhánh `main` của `pitien207/visa-hunter`), quyền **Container Apps Contributor** trên `visahunter-rg` |
| GitHub secrets / variables | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, biến `AZURE_RESOURCE_GROUP=visahunter-rg` |

**Max 1 bản sao là bắt buộc**: các phòng multiplayer nằm trong bộ nhớ của một tiến trình. Khi không ai chơi, app
scale về 0 (gần như miễn phí); người đầu tiên vào sẽ chờ vài giây để app khởi động.

## Việc bạn cần làm một lần

Image trên ghcr.io đã public (tải được không cần đăng nhập) và database đã nối sẵn — không còn việc bắt buộc.
Kiểm tra: `https://…azurecontainerapps.io/api/health` → `{"ok":true,"store":"mongodb",…}`.

### Vì sao Cosmos DB chứ không phải DocumentDB?
Gói Free của **Azure DocumentDB** (mongoClusters) chỉ cho **một cụm mỗi subscription** — suất đó đang là `lofitalk-db`.
Gói Free của **Cosmos DB** là suất riêng (một tài khoản free mỗi subscription) và còn trống, nên Visa Hunter có
database riêng, miễn phí, nằm trong `visahunter-rg`. Cả hai đều nói giao thức MongoDB, server dùng chung code
(`server/store.mjs`). Lưu ý Cosmos (RU): chỉ index TTL trên `_ts` được phép, nên token hết hạn được kiểm tra trong code.

Đổi connection string (vd. sau khi xoay khoá):

```bash
az containerapp secret set -n visa-hunter -g visahunter-rg --secrets "mongo-uri=$(az cosmosdb keys list -n visahunter-cosmos -g visahunter-rg --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv)"
az containerapp revision restart -n visa-hunter -g visahunter-rg --revision $(az containerapp show -n visa-hunter -g visahunter-rg --query properties.latestRevisionName -o tsv)
```

### Đăng nhập bằng Google (1.8.0)
Nút Google chỉ hiện khi server có `GOOGLE_CLIENT_ID`. Tạo một lần trong Google Cloud (miễn phí):

1. https://console.cloud.google.com → tạo project **Visa Hunter**.
2. *APIs & Services → OAuth consent screen* (Google Auth Platform → *Branding*): tên app "Visa Hunter", email hỗ trợ,
   *Audience*: **External**, rồi **Publish app** (chỉ xin `openid email profile` nên không cần Google duyệt).
3. *Clients → Create client* → loại **Web application** → *Authorized JavaScript origins*:
   - `https://visahunter.nghiapham.org`
   - `https://visa-hunter.blackisland-f796aa91.germanywestcentral.azurecontainerapps.io`
   - `http://localhost:5173` (dev trên máy)

   Không cần *Redirect URI*. Không cần client secret (Client ID không phải bí mật).
4. Copy **Client ID** (`…apps.googleusercontent.com`) rồi:

```bash
az containerapp update -n visa-hunter -g visahunter-rg --set-env-vars GOOGLE_CLIENT_ID=<client id>
```

Chạy local: `GOOGLE_CLIENT_ID=<client id> npm run server`.

### Băng thông (1.8.0)
- Build tạo sẵn bản nén `.br`/`.gz` cho mọi file chữ; server gửi bản nhỏ nhất (lần đầu ~1,15 MB thay vì ~4,2 MB).
- `assets/` có hash trong tên → cache 1 năm; file khác có ETag → không đổi thì trả 304, không tốn dữ liệu.
- Service worker lưu cả game trên máy; bản mới chỉ tải file thay đổi (three.js, physics, React lấy lại từ cache cũ).

### Tên miền (đã gắn 2026-11-15) `visahunter.nghiapham.org`
Ở nơi quản lý DNS của `nghiapham.org` thêm:

| Loại | Tên | Giá trị |
|---|---|---|
| CNAME | `visahunter` | `visa-hunter.blackisland-f796aa91.germanywestcentral.azurecontainerapps.io` |
| TXT | `asuid.visahunter` | mã xác minh: `az containerapp show -n visa-hunter -g visahunter-rg --query properties.customDomainVerificationId -o tsv` |

Rồi gắn domain + chứng chỉ miễn phí:

```bash
az containerapp hostname add  -n visa-hunter -g visahunter-rg --hostname visahunter.nghiapham.org
az containerapp hostname bind -n visa-hunter -g visahunter-rg --hostname visahunter.nghiapham.org --environment visahunter-env --validation-method CNAME
```

## Hằng ngày
- `git push` lên `main` → khoảng 3–4 phút sau bản mới chạy trên Azure (xem tab *Actions*).
- Quay về bản cũ: `az containerapp update -n visa-hunter -g visahunter-rg --image ghcr.io/pitien207/visa-hunter:<sha cũ>`
  (workflow giữ 10 image gần nhất).
- Xem log trực tiếp: `az containerapp logs show -n visa-hunter -g visahunter-rg --follow`.
- Chạy giống production trên máy: `npm run build && npm start` (http://localhost:8787; thêm `MONGO_URI=…` để dùng DB).

## Chi phí ước tính
- Container Apps Consumption: mỗi tháng miễn phí 180.000 vCPU-giây + 360.000 GiB-giây — với 0.25 vCPU, app chạy
  liên tục khoảng 200 giờ/tháng vẫn trong mức miễn phí; scale về 0 khi vắng người.
- Cosmos DB free tier: 1000 RU/s + 25 GB miễn phí (database đặt đúng 1000 RU/s dùng chung — đừng tăng, phần vượt sẽ tính tiền).
- ghcr.io: miễn phí cho package public.
