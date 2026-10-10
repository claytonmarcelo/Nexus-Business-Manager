# Gera o conjunto de favicons a partir do emblema da logo oficial.
Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot "..\apps\web\src\assets\brand\logo.png"
$dst = Join-Path $PSScriptRoot "..\apps\web\public"
$img = [System.Drawing.Image]::FromFile($src)

# Recorte do emblema hexagonal (sem o wordmark NEXUS BUSINESS MANAGER).
$side = 420; $cx = 317; $cy = 217
$rect = New-Object System.Drawing.Rectangle ($cx - [int]($side/2)), ($cy - [int]($side/2)), $side, $side
$emblem = New-Object System.Drawing.Bitmap $side, $side
$g = [System.Drawing.Graphics]::FromImage($emblem)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, (New-Object System.Drawing.Rectangle 0,0,$side,$side), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

foreach ($size in 16,32,48,180,512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g2 = [System.Drawing.Graphics]::FromImage($bmp)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g2.DrawImage($emblem, 0, 0, $size, $size)
  $g2.Dispose()
  $name = if ($size -eq 180) { "apple-touch-icon.png" } elseif ($size -eq 512) { "favicon-512.png" } else { "favicon-$size.png" }
  $bmp.Save((Join-Path $dst $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "gerado $name"
}
$emblem.Save((Join-Path $dst "favicon-emblem.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$emblem.Dispose()
$img.Dispose()
Write-Host "ok: favicons gerados em apps/web/public"
