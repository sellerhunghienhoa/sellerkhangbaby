import fs from 'node:fs';
import path from 'node:path';

const projectDir = path.resolve('ios/KhangBabyLIVE.xcodeproj');
const appDir = path.resolve('ios/KhangBabyLIVE');
const assetsDir = path.resolve('ios/KhangBabyLIVE/Assets.xcassets/AppIcon.appiconset');
const schemesDir = path.resolve('ios/KhangBabyLIVE.xcodeproj/xcshareddata/xcschemes');

fs.mkdirSync(projectDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(schemesDir, { recursive: true });

// Copy App Icons
const srcIcon180 = path.resolve('assets/brand/khangbaby-icon-180.png');
const srcIcon192 = path.resolve('assets/brand/khangbaby-icon-192.png');
const srcIcon512 = path.resolve('assets/brand/khangbaby-icon-512.png');

if (fs.existsSync(srcIcon180)) {
  fs.copyFileSync(srcIcon180, path.join(assetsDir, 'icon-180.png'));
  fs.copyFileSync(srcIcon180, path.join(appDir, 'AppIcon60x60@3x.png'));
  fs.copyFileSync(srcIcon180, path.join(appDir, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(srcIcon180, path.join(appDir, 'icon-180.png'));
}
if (fs.existsSync(srcIcon192)) {
  fs.copyFileSync(srcIcon192, path.join(assetsDir, 'icon-192.png'));
  fs.copyFileSync(srcIcon192, path.join(appDir, 'icon-192.png'));
}
if (fs.existsSync(srcIcon512)) {
  fs.copyFileSync(srcIcon512, path.join(assetsDir, 'icon-512.png'));
  fs.copyFileSync(srcIcon512, path.join(appDir, 'icon-512.png'));
  fs.copyFileSync(srcIcon512, path.join(appDir, 'iTunesArtwork'));
}

// Contents.json for AppIcon
const contentsJson = {
  images: [
    { size: "20x20", idiom: "iphone", filename: "icon-180.png", scale: "2x" },
    { size: "20x20", idiom: "iphone", filename: "icon-180.png", scale: "3x" },
    { size: "29x29", idiom: "iphone", filename: "icon-180.png", scale: "2x" },
    { size: "29x29", idiom: "iphone", filename: "icon-180.png", scale: "3x" },
    { size: "40x40", idiom: "iphone", filename: "icon-180.png", scale: "2x" },
    { size: "40x40", idiom: "iphone", filename: "icon-180.png", scale: "3x" },
    { size: "60x60", idiom: "iphone", filename: "icon-180.png", scale: "2x" },
    { size: "60x60", idiom: "iphone", filename: "icon-180.png", scale: "3x" },
    { size: "1024x1024", idiom: "ios-marketing", filename: "icon-512.png", scale: "1x" }
  ],
  info: { version: 1, author: "xcode" }
};
fs.writeFileSync(path.join(assetsDir, 'Contents.json'), JSON.stringify(contentsJson, null, 2));

// AppDelegate.swift
const appDelegateSwift = `import UIKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }

        application.setMinimumBackgroundFetchInterval(UIApplication.backgroundFetchIntervalMinimum)

        let win = UIWindow(frame: UIScreen.main.bounds)
        win.rootViewController = ViewController()
        win.makeKeyAndVisible()
        self.window = win
        return true
    }

    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        guard let url = URL(string: "https://sellerkhangbaby.online/api/tiktok/live/sync") else {
            completionHandler(.failed)
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "HEAD"
        request.timeoutInterval = 10
        URLSession.shared.dataTask(with: request) { _, response, error in
            if error == nil {
                completionHandler(.newData)
            } else {
                completionHandler(.failed)
            }
        }.resume()
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge, .list])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let act = userInfo["act"] as? String ?? ""
        let title = response.notification.request.content.title
        NotificationCenter.default.post(
            name: NSNotification.Name("HandleNotificationAction"),
            object: nil,
            userInfo: ["act": act, "title": title]
        )
        completionHandler()
    }
}
`;
fs.writeFileSync(path.join(appDir, 'AppDelegate.swift'), appDelegateSwift);

// ViewController.swift
const viewControllerSwift = `import UIKit
import WebKit
import UserNotifications

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIAdaptivePresentationControllerDelegate {
    private var webView: WKWebView!
    private var popupNavController: UINavigationController?
    private var popupWebView: WKWebView?
    private let refreshControl = UIRefreshControl()
    private let appURL = URL(string: "https://sellerkhangbaby.online/")!

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }

    private var pendingNotificationAction: String?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.98, alpha: 1.0)

        setupWebView()
        setupRefreshControl()
        NotificationCenter.default.addObserver(self, selector: #selector(handleNotificationAction(_:)), name: NSNotification.Name("HandleNotificationAction"), object: nil)
        loadApp()
    }

    @objc private func handleNotificationAction(_ notification: Notification) {
        guard let userInfo = notification.userInfo else { return }
        let act = userInfo["act"] as? String ?? ""
        let title = userInfo["title"] as? String ?? ""

        let js: String
        if !act.isEmpty {
            js = "if (typeof handleNotificationAction === 'function') { handleNotificationAction(\"\(act)\"); }"
        } else if title.contains("đơn Shop") {
            js = "if (typeof openTodayShopOrders === 'function') { openTodayShopOrders(); }"
        } else if title.contains("chưa gán") {
            js = "if (typeof openUnassignedSessions === 'function') { openUnassignedSessions(); }"
        } else if title.contains("kết thúc") || title.contains("đối soát") {
            js = "if (typeof openPendingRecSessions === 'function') { openPendingRecSessions(); }"
        } else if title.contains("phiên LIVE mới") {
            js = "if (typeof openTodaySessions === 'function') { openTodaySessions(); }"
        } else if title.contains("đơn hoàn") {
            js = "if (typeof openPendingReturns === 'function') { openPendingReturns(); }"
        } else {
            js = ""
        }

        if !js.isEmpty {
            if webView.isLoading {
                pendingNotificationAction = js
            } else {
                DispatchQueue.main.async {
                    self.webView.evaluateJavaScript(js, completionHandler: nil)
                }
            }
        }
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "nativeNotify")
        contentController.add(self, name: "setNativeBadge")
        contentController.add(self, name: "scheduleReminder")

        let jsBridge = """
        window.sendNativeNotification = function(title, body, opts) {
            var payload = { title: String(title || 'Seller KBB'), body: String(body || '') };
            if (typeof opts === 'number') {
                payload.badge = opts;
            } else if (opts && typeof opts === 'object') {
                if (typeof opts.badge === 'number') payload.badge = opts.badge;
                if (typeof opts.delay === 'number') payload.delay = opts.delay;
                if (opts.act) payload.act = String(opts.act);
            }
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeNotify) {
                window.webkit.messageHandlers.nativeNotify.postMessage(payload);
            }
        };
        window.scheduleBackgroundReminder = function(title, body, delaySeconds, badge) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.scheduleReminder) {
                window.webkit.messageHandlers.scheduleReminder.postMessage({
                    title: String(title || 'Seller KBB'),
                    body: String(body || ''),
                    delay: Number(delaySeconds || 1800),
                    badge: Number(badge || 0)
                });
            }
        };
        window.setNativeBadge = function(count) {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.setNativeBadge) {
                window.webkit.messageHandlers.setNativeBadge.postMessage(Number(count || 0));
            }
        };
        if (!window.Notification) {
            window.Notification = function(title, options) {
                options = options || {};
                window.sendNativeNotification(title, options.body || "", options);
            };
            window.Notification.permission = "granted";
            window.Notification.requestPermission = function() {
                return Promise.resolve("granted");
            };
        }
        """
        let userScript = WKUserScript(source: jsBridge, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(userScript)
        config.userContentController = contentController

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        // Keep genuine Safari UserAgent so Google OAuth never triggers 403 disallowed_useragent
        webView.customUserAgent = nil

        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func setupRefreshControl() {
        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        refreshControl.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        webView.scrollView.refreshControl = refreshControl
    }

    private func loadApp() {
        var request = URLRequest(url: appURL)
        request.cachePolicy = .useProtocolCachePolicy
        webView.load(request)
    }

    @objc private func handleRefresh() {
        if webView.url == nil || webView.url?.scheme != "https" {
            loadApp()
        } else {
            webView.reload()
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "nativeNotify", let dict = message.body as? [String: Any] {
            let title = dict["title"] as? String ?? "Seller KBB"
            let body = dict["body"] as? String ?? ""
            let act = dict["act"] as? String ?? ""

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if !act.isEmpty {
                content.userInfo = ["act": act]
            }
            if let badge = dict["badge"] as? NSNumber, badge.intValue > 0 {
                content.badge = badge
            }

            let delay = dict["delay"] as? Double ?? 0.0
            let trigger: UNNotificationTrigger? = delay > 0 ? UNTimeIntervalNotificationTrigger(timeInterval: max(1.0, delay), repeats: false) : nil
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)

            if let badge = dict["badge"] as? Int, badge >= 0 {
                DispatchQueue.main.async {
                    UIApplication.shared.applicationIconBadgeNumber = badge
                }
            }
        } else if message.name == "scheduleReminder", let dict = message.body as? [String: Any] {
            let title = dict["title"] as? String ?? "Seller KBB"
            let body = dict["body"] as? String ?? ""
            let delay = dict["delay"] as? Double ?? 1800.0
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            if let badge = dict["badge"] as? NSNumber, badge.intValue > 0 {
                content.badge = badge
            }
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(60.0, delay), repeats: false)
            let request = UNNotificationRequest(identifier: "khangbaby_bg_reminder", content: content, trigger: trigger)
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["khangbaby_bg_reminder"])
            if !body.isEmpty && delay > 0 {
                UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
            }
        } else if message.name == "setNativeBadge", let count = message.body as? Int {
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = max(0, count)
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refreshControl.endRefreshing()
        if let pending = pendingNotificationAction {
            pendingNotificationAction = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                webView.evaluateJavaScript(pending, completionHandler: nil)
            }
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
        showOfflinePageIfNeeded(error: error)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        refreshControl.endRefreshing()
        showOfflinePageIfNeeded(error: error)
    }

    private func showOfflinePageIfNeeded(error: Error) {
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain && nsError.code != NSURLErrorCancelled {
            let offlineHTML = """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background-color: #FFF7FA;
                  color: #2D1A24;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  padding: 24px;
                  text-align: center;
                  -webkit-user-select: none;
                }
                .offline-card {
                  background: #FFFFFF;
                  border: 1px solid #FCE7F3;
                  border-radius: 20px;
                  padding: 32px 24px;
                  max-width: 360px;
                  box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.1);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                }
                .icon-circle {
                  width: 64px;
                  height: 64px;
                  background: #FDF2F8;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 20px;
                  color: #EC4899;
                }
                h2 {
                  font-size: 19px;
                  font-weight: 700;
                  color: #831843;
                  margin-bottom: 8px;
                }
                p {
                  font-size: 14px;
                  color: #705D68;
                  line-height: 1.5;
                  margin-bottom: 24px;
                }
                .retry-btn {
                  display: inline-block;
                  width: 100%;
                  padding: 13px 20px;
                  background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%);
                  color: #FFFFFF;
                  font-size: 15px;
                  font-weight: 600;
                  border-radius: 12px;
                  text-decoration: none;
                  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
                  cursor: pointer;
                  border: none;
                }
              </style>
            </head>
            <body>
              <div class="offline-card">
                <div class="icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                  </svg>
                </div>
                <h2>Không có kết nối mạng</h2>
                <p>Vui lòng kiểm tra kết nối Wi-Fi hoặc 4G/5G trên thiết bị của bạn rồi thử lại.</p>
                <button class="retry-btn" onclick="window.location.href='https://sellerkhangbaby.online/'">Thử lại ngay</button>
              </div>
            </body>
            </html>
            """
            webView.loadHTMLString(offlineHTML, baseURL: nil)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        closePopup()

        let popup = WKWebView(frame: .zero, configuration: configuration)
        popup.navigationDelegate = self
        popup.uiDelegate = self
        popup.allowsBackForwardNavigationGestures = true
        popup.translatesAutoresizingMaskIntoConstraints = false

        let popupVC = UIViewController()
        popupVC.view.backgroundColor = .systemBackground
        popupVC.title = "Đăng nhập Google"
        popupVC.view.addSubview(popup)

        NSLayoutConstraint.activate([
            popup.topAnchor.constraint(equalTo: popupVC.view.safeAreaLayoutGuide.topAnchor),
            popup.leadingAnchor.constraint(equalTo: popupVC.view.leadingAnchor),
            popup.trailingAnchor.constraint(equalTo: popupVC.view.trailingAnchor),
            popup.bottomAnchor.constraint(equalTo: popupVC.view.bottomAnchor)
        ])

        let closeBtn = UIBarButtonItem(title: "Đóng ✕", style: .plain, target: self, action: #selector(closePopup))
        closeBtn.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        closeBtn.setTitleTextAttributes([
            .font: UIFont.systemFont(ofSize: 15, weight: .bold)
        ], for: .normal)
        popupVC.navigationItem.rightBarButtonItem = closeBtn

        let nav = UINavigationController(rootViewController: popupVC)
        nav.modalPresentationStyle = .fullScreen

        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(red: 1.0, green: 0.97, blue: 0.98, alpha: 1.0)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(red: 0.2, green: 0.1, blue: 0.2, alpha: 1.0),
            .font: UIFont.systemFont(ofSize: 16, weight: .bold)
        ]
        nav.navigationBar.standardAppearance = appearance
        nav.navigationBar.scrollEdgeAppearance = appearance
        nav.navigationBar.compactAppearance = appearance
        nav.navigationBar.tintColor = UIColor(red: 0.996, green: 0.173, blue: 0.333, alpha: 1.0)
        nav.presentationController?.delegate = self

        self.popupWebView = popup
        self.popupNavController = nav

        if let presented = presentedViewController {
            presented.present(nav, animated: true, completion: nil)
        } else {
            present(nav, animated: true, completion: nil)
        }

        return popup
    }

    @objc private func closePopup() {
        popupWebView?.stopLoading()
        if let nav = popupNavController {
            if !nav.isBeingDismissed {
                nav.dismiss(animated: true) { [weak self] in
                    self?.popupWebView = nil
                    self?.popupNavController = nil
                }
            }
        } else {
            popupWebView = nil
            popupNavController = nil
        }
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        popupWebView?.stopLoading()
        popupWebView = nil
        popupNavController = nil
    }

    func webViewDidClose(_ webView: WKWebView) {
        if webView == popupWebView {
            closePopup()
        }
    }

    deinit {
        webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress))
    }
}
`;
fs.writeFileSync(path.join(appDir, 'ViewController.swift'), viewControllerSwift);

// Info.plist
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>vi</string>
	<key>CFBundleDisplayName</key>
	<string>Seller KBB</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIcons</key>
	<dict>
		<key>CFBundlePrimaryIcon</key>
		<dict>
			<key>CFBundleIconFiles</key>
			<array>
				<string>AppIcon60x60</string>
				<string>icon-180</string>
				<string>icon-192</string>
				<string>icon-512</string>
			</array>
			<key>CFBundleIconName</key>
			<string>AppIcon</string>
		</dict>
	</dict>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>2.0.0</string>
	<key>CFBundleVersion</key>
	<string>20261101</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	<key>NSCameraUsageDescription</key>
	<string>Seller KBB cần quyền truy cập camera để quét mã QR tài khoản hoặc mã đơn hàng</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Seller KBB cần quyền truy cập thư viện ảnh để tải lên chứng từ đối soát hoặc đổi avatar</string>
	<key>UIDeviceFamily</key>
	<array>
		<integer>1</integer>
		<integer>2</integer>
	</array>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>
	<key>UIRequiresFullScreen</key>
	<false/>
	<key>UIBackgroundModes</key>
	<array>
		<string>fetch</string>
	</array>
	<key>UIStatusBarStyle</key>
	<string>UIStatusBarStyleDarkContent</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<true/>
</dict>
</plist>
`;
fs.writeFileSync(path.join(appDir, 'Info.plist'), infoPlist);

// project.pbxproj
const pbxproj = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
		1001 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2001 /* AppDelegate.swift */; };
		1002 /* ViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = 2002 /* ViewController.swift */; };
		1003 /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = 2003 /* Assets.xcassets */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		0001 /* KhangBabyLIVE.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = KhangBabyLIVE.app; sourceTree = BUILT_PRODUCTS_DIR; };
		2001 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
		2002 /* ViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ViewController.swift; sourceTree = "<group>"; };
		2003 /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };
		2004 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		3001 /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		4001 = {
			isa = PBXGroup;
			children = (
				4002 /* KhangBabyLIVE */,
				4003 /* Products */,
			);
			sourceTree = "<group>";
		};
		4002 /* KhangBabyLIVE */ = {
			isa = PBXGroup;
			children = (
				2001 /* AppDelegate.swift */,
				2002 /* ViewController.swift */,
				2003 /* Assets.xcassets */,
				2004 /* Info.plist */,
			);
			path = KhangBabyLIVE;
			sourceTree = "<group>";
		};
		4003 /* Products */ = {
			isa = PBXGroup;
			children = (
				0001 /* KhangBabyLIVE.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		5001 /* KhangBabyLIVE */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 6001 /* Build configuration list for PBXNativeTarget "KhangBabyLIVE" */;
			buildPhases = (
				7001 /* Sources */,
				3001 /* Frameworks */,
				8001 /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = KhangBabyLIVE;
			productName = KhangBabyLIVE;
			productReference = 0001 /* KhangBabyLIVE.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		9001 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
				TargetAttributes = {
					5001 = {
						CreatedOnToolsVersion = 15.0;
					};
				};
			};
			buildConfigurationList = 6002 /* Build configuration list for PBXProject "KhangBabyLIVE" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = vi;
			hasScannedForEncodings = 0;
			knownRegions = (
				vi,
				Base,
			);
			mainGroup = 4001;
			productRefGroup = 4003 /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				5001 /* KhangBabyLIVE */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		8001 /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1003 /* Assets.xcassets in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		7001 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1001 /* AppDelegate.swift in Sources */,
				1002 /* ViewController.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		A001 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = NO;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDEFINED_VARIABLES = YES;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		A002 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CLANG_ANALYZER_NONNULL = YES;
				CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				CLANG_ENABLE_OBJC_WEAK = YES;
				CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
				CLANG_WARN_BOOL_CONVERSION = YES;
				CLANG_WARN_COMMA = YES;
				CLANG_WARN_CONSTANT_CONVERSION = YES;
				CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
				CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
				CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
				CLANG_WARN_EMPTY_BODY = YES;
				CLANG_WARN_ENUM_CONVERSION = YES;
				CLANG_WARN_INFINITE_RECURSION = YES;
				CLANG_WARN_INT_CONVERSION = YES;
				CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
				CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
				CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
				CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
				CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
				CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
				CLANG_WARN_STRICT_PROTOTYPES = YES;
				CLANG_WARN_SUSPICIOUS_MOVE = YES;
				CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
				CLANG_WARN_UNREACHABLE_CODE = YES;
				CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = NO;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
				GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
				GCC_WARN_UNDEFINED_VARIABLES = YES;
				GCC_WARN_UNUSED_FUNCTION = YES;
				GCC_WARN_UNUSED_VARIABLE = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				MTL_ENABLE_DEBUG_INFO = NO;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
		A003 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 20261101;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = KhangBabyLIVE/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 2.0.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.khangbaby.livekpi;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		A004 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 20261101;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = KhangBabyLIVE/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 15.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 2.0.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.khangbaby.livekpi;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		6001 /* Build configuration list for PBXNativeTarget "KhangBabyLIVE" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				A003 /* Debug */,
				A004 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		6002 /* Build configuration list for PBXProject "KhangBabyLIVE" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				A001 /* Debug */,
				A002 /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 9001 /* Project object */;
}
`;
fs.writeFileSync(path.join(projectDir, 'project.pbxproj'), pbxproj);

// Shared Scheme for CLI xcodebuild and Xcode
const schemeXml = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "5001"
               BuildableName = "KhangBabyLIVE.app"
               BlueprintName = "KhangBabyLIVE"
               ReferencedContainer = "container:KhangBabyLIVE.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
      </Testables>
   </TestAction>
   <LaunchAction
      buildConfiguration = "Release"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "5001"
            BuildableName = "KhangBabyLIVE.app"
            BlueprintName = "KhangBabyLIVE"
            ReferencedContainer = "container:KhangBabyLIVE.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "5001"
            BuildableName = "KhangBabyLIVE.app"
            BlueprintName = "KhangBabyLIVE"
            ReferencedContainer = "container:KhangBabyLIVE.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
`;
fs.writeFileSync(path.join(schemesDir, 'KhangBabyLIVE.xcscheme'), schemeXml);

console.log('✅ Generated iOS Xcode project and scheme in ios/');
