# Clean Socket-based HTTP Server that accepts any Host header
$port = 8080
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$server.Start()

Write-Host "TCP HTTP Server listening on port $port (accepts all host headers)..."

try {
    while ($true) {
        $client = $server.AcceptTcpClient()
        [System.Threading.ThreadPool]::QueueUserWorkItem({
            param($c)
            try {
                $stream = $c.GetStream()
                $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
                $firstLine = $reader.ReadLine()
                if (-not $firstLine) { $c.Close(); return }

                # Read remaining headers
                while ($true) {
                    $headerLine = $reader.ReadLine()
                    if ([string]::IsNullOrWhiteSpace($headerLine)) { break }
                }

                $parts = $firstLine.Split(' ')
                $method = $parts[0]
                $rawUrl = $parts[1]
                
                $path = $rawUrl.Split('?')[0].TrimStart('/')
                if ([string]::IsNullOrEmpty($path)) { $path = "index.html" }

                $root = $using:PSScriptRoot
                $filePath = [System.IO.Path]::Combine($root, $path)

                if ([System.IO.File]::Exists($filePath)) {
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = switch ($ext) {
                        ".html" { "text/html; charset=utf-8" }
                        ".css"  { "text/css; charset=utf-8" }
                        ".js"   { "application/javascript; charset=utf-8" }
                        ".json" { "application/json; charset=utf-8" }
                        ".png"  { "image/png" }
                        ".jpg"  { "image/jpeg" }
                        default { "application/octet-stream" }
                    }
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    if ($method -ne "HEAD") {
                        $stream.Write($bytes, 0, $bytes.Length)
                    }
                } else {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($msg, 0, $msg.Length)
                }
            } catch {
                # Ignore connection reset
            } finally {
                $c.Close()
            }
        }, $client) | Out-Null
    }
} finally {
    $server.Stop()
}
