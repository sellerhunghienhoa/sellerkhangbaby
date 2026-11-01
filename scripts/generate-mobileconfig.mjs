import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const iconPath = path.resolve('assets/brand/khangbaby-icon-180.png');
const iconBase64 = fs.readFileSync(iconPath).toString('base64');

const profileUuid = crypto.randomUUID().toUpperCase();
const payloadUuid = crypto.randomUUID().toUpperCase();

const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
${iconBase64.match(/.{1,76}/g).join('\n')}
			</data>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>Khang Baby</string>
			<key>PayloadDescription</key>
			<string>Cấu hình cài đặt ứng dụng Khang Baby LIVE KPI lên màn hình chính</string>
			<key>PayloadDisplayName</key>
			<string>Khang Baby LIVE KPI</string>
			<key>PayloadIdentifier</key>
			<string>com.khangbaby.livekpi.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>${payloadUuid}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>https://sellerkhangbaby-live-kpi.sellerhunghienhoa.workers.dev/</string>
		</dict>
	</array>
	<key>PayloadDescription</key>
	<string>Cài đặt ứng dụng Khang Baby LIVE KPI (TikTok Shop GMV &amp; Đối soát phiên LIVE) trực tiếp lên iPhone/iPad không cần qua máy tính hay chứng chỉ 7 ngày.</string>
	<key>PayloadDisplayName</key>
	<string>Khang Baby LIVE KPI</string>
	<key>PayloadIdentifier</key>
	<string>com.khangbaby.livekpi</string>
	<key>PayloadOrganization</key>
	<string>Khang Baby Co., Ltd</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${profileUuid}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>
`;

fs.writeFileSync(path.resolve('KhangBabyLIVE.mobileconfig'), mobileconfig);
console.log('✅ Generated KhangBabyLIVE.mobileconfig successfully');
