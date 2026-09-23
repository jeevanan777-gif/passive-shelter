param (
    [switch]$NoBrowser
)

# Robust Zero-Dependency Local HTTP Server for Passive Shelter Designer
$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "   PASSIVE SHELTER DESIGNER - LOCAL WEB SERVER ACTIVE" -ForegroundColor Green
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "Serving from: $PSScriptRoot"
    Write-Host "URL: $prefix" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray
    
    if (-not $NoBrowser) {
        Start-Process $prefix
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $path = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }
            $filePath = Join-Path $PSScriptRoot $path
            
            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($ext) {
                    ".html" { $response.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                    ".json" { $response.ContentType = "application/json; charset=utf-8" }
                    ".png"  { $response.ContentType = "image/png" }
                    ".jpg"  { $response.ContentType = "image/jpeg" }
                    default { $response.ContentType = "application/octet-stream" }
                }
                
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200

                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            }
        } catch {
            Write-Host "Request error: $_" -ForegroundColor Red
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
}
