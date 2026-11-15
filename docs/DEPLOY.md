# Triển khai Visa Hunter lên Azure (Container Apps + DocumentDB)

Từ 1.7.0 game có server (tài khoản, save trên mây, multiplayer qua WebSocket), nên **không** dùng Static Web Apps
nữa (không chạy được server WebSocket). Cách triển khai giống dự án lofitalk:

```
git push main ──► GitHub Actions (.github/workflows/deploy.yml)
                    ├─ docker build (npm ci + typecheck + vite build, server deps)
                    ├─ push ghcr.io/pitien207/visa-hunter:<sha>
                    └─ az containerapp update (đăng nhập Azure bằng OIDC, không có mật khẩu)
                                   │
Azure  visahunter-rg ─ visahunter-env ─ Container App "visa-hunter" (Node 24, cổng 8080, 0–1 bản sao)
                                   │  MONGO_URI (secret) ─► lofitalk-db (Azure DocumentDB, gói Free), database "visahunter"
```

## Tài nguyên đã tạo (2026-11-15)

| Thứ | Giá trị |
|---|---|
| Resource group | `visahunter-rg` (Germany West Central) |
| Container Apps environment | `visahunter-env` (Consumption, không gửi log → không tốn Log Analytics) |
| Container App | `visa-hunter`, 0.25 vCPU / 0.5 GiB, **min 0 – max 1 bản sao** |
| Địa chỉ | https://visa-hunter.blackisland-f796aa91.germanywestcentral.azurecontainerapps.io |
| Database | cụm có sẵn `lofitalk-db` (DocumentDB, MongoDB API) — database riêng `visahunter` (collections `users`, `tokens`, `saves`) |
| GitHub → Azure | app registration `github-visahunter-deploy` (OIDC, chỉ nhánh `main` của `pitien207/visa-hunter`), quyền **Container Apps Contributor** trên `visahunter-rg` |
| GitHub secrets / variables | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, biến `AZURE_RESOURCE_GROUP=visahunter-rg` |

**Max 1 bản sao là bắt buộc**: các phòng multiplayer nằm trong bộ nhớ của một tiến trình. Khi không ai chơi, app
scale về 0 (gần như miễn phí); người đầu tiên vào sẽ chờ vài giây để app khởi động.

## Việc bạn cần làm một lần

### 1. Cho image trên ghcr.io ở chế độ Public
Lần chạy workflow đầu tiên tạo package `visa-hunter` (mặc định **Private**, Azure không kéo về được):
GitHub → hồ sơ của bạn → *Packages* → **visa-hunter** → *Package settings* → *Change visibility* → **Public**.
(Giống package `lofitalk`.) Sau đó chạy lại workflow: *Actions* → *Build and deploy…* → **Re-run**.

### 2. Kết nối database (connection string của DocumentDB)
Không có bước này game vẫn chạy, nhưng tài khoản và save chỉ nằm tạm trong container (mất khi app khởi động lại).

Lấy connection string: Portal → `lofitalk-db` → *Settings → Connection strings* (thay `<user>`/`<password>` bằng
tài khoản admin của cụm). Rồi chạy (PowerShell hoặc Git Bash):

```bash
az containerapp secret set -n visa-hunter -g visahunter-rg --secrets "mongo-uri=<connection string>"
az containerapp update   -n visa-hunter -g visahunter-rg --set-env-vars MONGO_URI=secretref:mongo-uri MONGO_DB=visahunter
```

Kiểm tra: mở `https://…azurecontainerapps.io/api/health` → `{"ok":true,"store":"mongodb",…}`.
(Firewall của `lofitalk-db` đã cho phép dịch vụ Azure, nên Container App kết nối được.)

### 3. (Tuỳ chọn) Tên miền `visahunter.nghiapham.org`
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
- DocumentDB: dùng chung cụm gói Free đang có, không phát sinh thêm.
- ghcr.io: miễn phí cho package public.
