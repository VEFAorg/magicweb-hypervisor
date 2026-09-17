package main

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

//go:embed embedded_web/*
var embeddedWeb embed.FS

const (
	defaultPort = 8080
)

func openBrowserOrWindow(url string) error {
	switch runtime.GOOS {
	case "windows":
		// Launch Edge in standalone chromeless app window mode
		edgePaths := []string{
			filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(os.Getenv("LOCALAPPDATA"), "Microsoft", "Edge", "Application", "msedge.exe"),
		}
		for _, p := range edgePaths {
			if _, err := os.Stat(p); err == nil {
				cmd := exec.Command(p, fmt.Sprintf("--app=%s", url), "--window-size=1440,900")
				if err := cmd.Start(); err == nil {
					return nil
				}
			}
		}
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		return exec.Command("open", url).Start()
	default:
		// Linux / BSD: Use xdg-open
		return exec.Command("xdg-open", url).Start()
	}
}

func getMimeType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js", ".mjs":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".wasm":
		return "application/wasm"
	case ".png":
		return "image/png"
	case ".svg":
		return "image/svg+xml"
	default:
		return "application/octet-stream"
	}
}

func startServer(subFS fs.FS) (int, error) {
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", defaultPort))
	actualPort := defaultPort
	if err != nil {
		listener, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return 0, fmt.Errorf("failed to bind listener: %w", err)
		}
		actualPort = listener.Addr().(*net.TCPAddr).Port
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Mandatory 2026 WebAssembly Cross-Origin Isolation Headers
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Cross-Origin-Embedder-Policy", "credentialless")
		w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		cleanPath := strings.TrimPrefix(r.URL.Path, "/")
		if cleanPath == "" {
			cleanPath = "index.html"
		}

		if cleanPath == "sw.js" {
			w.Header().Set("Service-Worker-Allowed", "/")
		}

		data, err := fs.ReadFile(subFS, cleanPath)
		if err != nil {
			// Virtual port fallback to index.html before Service Worker claims
			if strings.HasPrefix(cleanPath, "service/") {
				if htmlData, errHtml := fs.ReadFile(subFS, "index.html"); errHtml == nil {
					w.Header().Set("Content-Type", "text/html; charset=utf-8")
					w.WriteHeader(http.StatusOK)
					w.Write(htmlData)
					return
				}
			}
			http.NotFound(w, r)
			return
		}

		w.Header().Set("Content-Type", getMimeType(cleanPath))
		w.WriteHeader(http.StatusOK)
		w.Write(data)
	})

	server := &http.Server{
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("[Server Error] %v", err)
		}
	}()

	return actualPort, nil
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	fmt.Println("==================================================================")
	fmt.Println("  PROJECT MAGICWEB v3.2 - NATIVE STANDALONE DESKTOP RUNTIME       ")
	fmt.Println("  Dual-Plane WASI Hypervisor, Worker Mesh & Vector Copilot        ")
	fmt.Println("==================================================================")

	subFS, err := fs.Sub(embeddedWeb, "embedded_web")
	if err != nil {
		log.Fatalf("Failed to extract embedded assets: %v", err)
	}

	port, err := startServer(subFS)
	if err != nil {
		log.Fatalf("Failed to initialize hypervisor engine: %v", err)
	}

	targetURL := fmt.Sprintf("http://127.0.0.1:%d/", port)
	fmt.Printf("[+] Hypervisor running on: %s\n", targetURL)
	fmt.Println("[+] Cross-Origin Isolation: ENABLED (COOP: same-origin, COEP: credentialless)")
	fmt.Println("[+] Launching application window...")

	time.Sleep(250 * time.Millisecond)
	if err := openBrowserOrWindow(targetURL); err != nil {
		fmt.Printf("[!] Note: please open %s in your browser.\n", targetURL)
	} else {
		fmt.Println("[✓] Application window launched successfully.")
	}

	fmt.Println("\nPress Ctrl+C in this terminal to exit.")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\nShutting down MagicWeb Desktop App...")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = ctx
}
