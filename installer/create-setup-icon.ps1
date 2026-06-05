# يولّد أيقونة المثبت sewartech-setup.ico من ألوان العلامة
$ErrorActionPreference = 'Stop'
$OutDir = $PSScriptRoot
$IcoPath = Join-Path $OutDir 'sewartech-setup.ico'

Add-Type -AssemblyName System.Drawing

function New-BrandBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $rect = New-Object System.Drawing.RectangleF ($size * 0.12), ($size * 0.12), ($size * 0.76), ($size * 0.76)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 56, 189, 248),
        [System.Drawing.Color]::FromArgb(255, 99, 102, 241),
        45.0
    )
    $g.FillEllipse($brush, $rect)
    $fontSize = [math]::Max(8, [int]($size * 0.28))
    $font = New-Object System.Drawing.Font("Segoe UI", [float]$fontSize, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString('ST', $font, [System.Drawing.Brushes]::White, $rect, $sf)
    $g.Dispose()
    $brush.Dispose()
    $font.Dispose()
    return $bmp
}

# حفظ ICO متعدد الأحجام عبر Icon.FromHandle (256 كأساس)
$bmp256 = New-BrandBitmap 256
$hIcon = $bmp256.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Create($IcoPath)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp256.Dispose()

Write-Host "Created: $IcoPath"
