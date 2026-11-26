# Chạy Pocket Leben trên NAS ở nhà (UGREEN DXP2800 + Vodafone Glasfaser)

Thay cho Azure (docs/DEPLOY.md). Mọi thứ nằm trong `deploy/nas/docker-compose.yml`:

```
Người chơi ──HTTPS/WSS──▶ Cloudflare ──tunnel (NAS gọi ra, không mở cổng router)──▶ cloudflared
                                                                                     │
                                                                  game :8080 (web + server) ──▶ mongo
                                                      watchtower: 5 phút kiểm tra ghcr.io một lần, có image mới thì cập nhật game
```

**Vì sao dùng Cloudflare Tunnel:** Vodafone Glasfaser (và cáp) ở Đức thường là **DS-Lite** — không có IPv4 công khai riêng,
nên mở cổng router không dùng được cho người chơi IPv4. Tunnel do NAS gọi ra ngoài, nên chạy được với mọi kiểu đường truyền,
không lộ IP nhà, không lộ trang quản trị NAS, HTTPS + WebSocket có sẵn. DNS của `nghiapham.org` đã ở Cloudflare.

**Phần cứng đủ chưa:** DXP2800 = Intel N100 (x86-64, có AVX2) + 8 GB RAM → image hiện tại và MongoDB 8 chạy được, không phải
build lại. Mạng: 50 người cùng một phố ≈ 1 MB/s (8 Mbit/s) chiều **upload** — đường Glasfaser dư sức (xem upload trong hợp đồng,
thường vài trăm Mbit/s).

---

## 1. Chuẩn bị trên NAS (một lần)

1. UGOS Pro → App Center → cài **Docker**.
2. Tạo thư mục, ví dụ trong thư mục chia sẻ `docker`: `docker/pocket-leben/`.
3. Chép vào đó `deploy/nas/docker-compose.yml` và `deploy/nas/.env.example` → đổi tên thành `.env`.
4. Bật SSH (Control Panel → Terminal) nếu muốn chạy lệnh tay (sao lưu, `docker login`). Không bắt buộc.

## 2. Image trên ghcr.io

Image `ghcr.io/pitien207/pocket-leben` hiện **chưa tải được khi không đăng nhập** (riêng tư). Chọn một:

- **Cho công khai (đơn giản nhất):** GitHub → Your profile → Packages → `pocket-leben` → Package settings → Change visibility →
  Public. Image chỉ chứa game đã build + server — cùng nội dung với repo công khai, không có bí mật (bí mật nằm trong `.env`).
- **Giữ riêng tư:** GitHub → Settings → Developer settings → Personal access token (classic) chỉ quyền `read:packages`; trên NAS
  (SSH) chạy `docker login ghcr.io -u pitien207` (mật khẩu = token), rồi bỏ dấu `#` ở dòng `config.json` của watchtower trong
  compose.

## 3. Cloudflare Tunnel

1. dash.cloudflare.com → **Zero Trust** → Networks → **Tunnels** → Create a tunnel → *Cloudflared* → tên `pocket-leben`.
2. Chọn môi trường **Docker**, chép **token** (chuỗi dài sau `--token`) vào `.env` → `CF_TUNNEL_TOKEN=…`.
3. Tab **Public Hostname** → Add:
   - Subdomain `pocketleben`, Domain `nghiapham.org`
   - Service: **HTTP** → `game:8080`
4. Nếu Cloudflare báo bản ghi đã tồn tại: DNS → xóa CNAME `pocketleben` cũ (trỏ về Azure) rồi lưu lại hostname. Tunnel tự tạo
   CNAME mới (mây cam = proxied).
5. WebSocket: Cloudflare bật sẵn, không cần chỉnh. Server lấy IP người chơi từ header `CF-Connecting-IP` (giới hạn số lần đăng
   nhập theo từng người, không phải theo tunnel).

## 4. Chạy

UGOS Pro → Docker → **Project** → Create → chọn thư mục `docker/pocket-leben` (nhận `docker-compose.yml`) → Deploy.
Hoặc qua SSH trong thư mục đó: `docker compose up -d`.

Kiểm tra:
- Trong mạng nhà: `http://<ip-nas>:8090/api/health` → `{"ok":true,"store":"mongodb",…}`.
- Từ ngoài: `https://pocketleben.nghiapham.org/api/health`.
- Mở game, đăng nhập, mở 2 tab xem có thấy nhau (multiplayer chạy qua tunnel).

Google đăng nhập: domain giữ nguyên `pocketleben.nghiapham.org` nên **không phải sửa** Google OAuth client.

## 5. Chuyển dữ liệu từ Azure (tài khoản, save, bạn bè)

Làm khi đổi DNS, để không ai lưu vào chỗ cũ trong lúc chuyển:

```sh
# trên NAS, trong thư mục docker/pocket-leben (chuỗi kết nối Cosmos: Azure Portal → pocketleben-cosmos → Connection strings)
docker compose exec mongo mongodump --uri "<chuỗi kết nối Cosmos>" --db pocketleben --out /backup/from-azure
docker compose exec mongo mongorestore --uri "mongodb://localhost:27017" --nsInclude "pocketleben.*" /backup/from-azure
docker compose restart game
```

(Thư mục `backup/` của project được gắn vào container mongo ở `/backup`.)

## 6. Cập nhật game

Không đổi gì: push lên `main` → GitHub Actions build image mới lên ghcr.io → **watchtower** trên NAS thấy trong ≤ 5 phút, kéo về,
khởi động lại container `game` (người đang chơi bị ngắt vài giây rồi tự nối lại; người chơi thấy nút cập nhật như trước).

Khi đã bỏ Azure: trong `.github/workflows/deploy.yml` xóa (hoặc tắt) các bước *Azure login* + *Deploy new image to the Container
App*; giữ bước build + push image. Nếu log watchtower báo `client version 1.25 is too old`, bỏ dấu `#` ở `DOCKER_API_VERSION`.

## 7. Sao lưu

- Hằng ngày (Task Scheduler của UGOS hoặc cron qua SSH):
  `docker compose -f /…/pocket-leben/docker-compose.yml exec -T mongo mongodump --db pocketleben --archive=/backup/pocketleben-$(date +%F).gz --gzip`
- Thư mục `backup/` đưa vào ứng dụng sao lưu của UGOS (sang ổ khác / cloud). Giữ vài bản gần nhất.
- `data/mongo/` là dữ liệu đang chạy: đừng chép tay khi mongo đang chạy, dùng `mongodump` như trên.

## 8. Tắt Azure (bạn tự làm, khi NAS chạy ổn vài ngày)

Xóa resource group `pocketleben-rg` (Container App, môi trường, Cosmos DB) theo docs/DEPLOY.md. Image trên ghcr.io vẫn giữ.

## Lưu ý

- Chỉ chạy **một** container `game` (phòng chơi nằm trong bộ nhớ server).
- NAS tắt / mất mạng = game ngừng. Đặt NAS sau UPS nếu có.
- Không mở cổng router nào cho game; trang quản trị NAS không cần ra internet.
- Cổng 8090 chỉ để thử trong nhà; có thể xóa đoạn `ports:` khi đã chạy qua tunnel.
