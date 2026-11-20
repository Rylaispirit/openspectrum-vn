# ============================================================================
# OPENSPECTRUM-VN — KHỞI CHẠY TẤT CẢ DỊCH VỤ DEV
# ============================================================================
Write-Host "🌟 Đang khởi chạy OpenSpectrum-VN..." -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Khởi chạy Python Research Engine (Cổng 8000)
Write-Host "1. Khởi động Python Research Engine (http://127.0.0.1:8000)..." -ForegroundColor Yellow
Start-Process -FilePath "uv" -ArgumentList "run uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$root\services\research-engine"

# 2. Khởi chạy Node API Gateway (Cổng 4000)
Write-Host "2. Khởi động Node API Gateway (http://localhost:4000)..." -ForegroundColor Yellow
Start-Process -FilePath "pnpm" -ArgumentList "dev:api" -WorkingDirectory "$root"

# 3. Khởi chạy Vite Web (Cổng 5173)
Write-Host "3. Khởi động Giao diện Web (http://localhost:5173)..." -ForegroundColor Yellow
Start-Process -FilePath "pnpm" -ArgumentList "dev:web" -WorkingDirectory "$root"

Start-Sleep -Seconds 3
Write-Host "`n✅ Toàn bộ hệ thống đã sẵn sàng!" -ForegroundColor Green
Write-Host "👉 Mở trình duyệt tại: http://localhost:5173" -ForegroundColor White
Write-Host "👉 Swagger API Docs:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "👉 API Health Check:   http://localhost:4000/api/health`n" -ForegroundColor White
