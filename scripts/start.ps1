# ToneForge / 音锻 — 项目启动脚本
# 用法: .\start.ps1 [dev|build|preview|dist|cli|install]

param(
    [Parameter(Position = 0)]
    [ValidateSet("dev", "build", "preview", "dist", "cli", "install", "")]
    [string]$Command = "dev"
)

function Show-Usage {
    Write-Host "ToneForge / 音锻 — 启动脚本" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法: .\start.ps1 [命令]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "可用命令:"
    Write-Host "  dev      开发模式（热重载）           npm run dev"
    Write-Host "  build    生产构建                      npm run build"
    Write-Host "  preview  预览生产构建                  npm run preview"
    Write-Host "  dist     打包为安装程序                npm run dist"
    Write-Host "  cli      查看 CLI 帮助                npm run cli -- --help"
    Write-Host "  install  安装项目依赖                  npm install"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\start.ps1 dev"
    Write-Host "  .\start.ps1 cli"
    Write-Host "  .\start.ps1 dist"
    Write-Host ""
}

switch ($Command) {
    "" {
        Show-Usage
    }
    "install" {
        Write-Host "[1/1] 正在安装依赖..." -ForegroundColor Green
        npm install
    }
    "dev" {
        Write-Host "[1/1] 启动开发模式（热重载）..." -ForegroundColor Green
        npm run dev
    }
    "build" {
        Write-Host "[1/1] 执行生产构建..." -ForegroundColor Green
        npm run build
    }
    "preview" {
        Write-Host "[1/1] 预览生产构建..." -ForegroundColor Green
        npm run preview
    }
    "dist" {
        Write-Host "[1/2] 执行生产构建..." -ForegroundColor Green
        npm run build
        if ($?) {
            Write-Host "[2/2] 打包为安装程序..." -ForegroundColor Green
            npm run dist
        }
    }
    "cli" {
        Write-Host "[1/1] 显示 CLI 帮助..." -ForegroundColor Green
        npm run cli -- --help
    }
}
