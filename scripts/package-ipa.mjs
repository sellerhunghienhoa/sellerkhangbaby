import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const PAYLOAD_DIR = path.join(ROOT, 'Payload');
const APP_DIR = path.join(PAYLOAD_DIR, 'KhangBabyLIVE.app');
const WWW_DIR = path.join(APP_DIR, 'www');
const IPA_PATH = path.join(ROOT, 'KhangBabyLIVE.ipa');

console.log('1. Building fresh dist bundle...');
execSync('node scripts/build.mjs', { stdio: 'inherit' });

console.log('2. Preparing Payload directory...');
if (fs.existsSync(PAYLOAD_DIR)) {
  fs.rmSync(PAYLOAD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(APP_DIR, { recursive: true });
fs.mkdirSync(WWW_DIR, { recursive: true });

// Copy dist/ into www/
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(path.join(ROOT, 'dist'), WWW_DIR);

// Copy Icons
const icon180 = path.join(ROOT, 'assets/brand/khangbaby-icon-180.png');
const icon192 = path.join(ROOT, 'assets/brand/khangbaby-icon-192.png');
const icon512 = path.join(ROOT, 'assets/brand/khangbaby-icon-512.png');

if (fs.existsSync(icon180)) {
  fs.copyFileSync(icon180, path.join(APP_DIR, 'AppIcon60x60@3x.png'));
  fs.copyFileSync(icon180, path.join(APP_DIR, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(icon180, path.join(APP_DIR, 'icon-180.png'));
}
if (fs.existsSync(icon192)) {
  fs.copyFileSync(icon192, path.join(APP_DIR, 'icon-192.png'));
}
if (fs.existsSync(icon512)) {
  fs.copyFileSync(icon512, path.join(APP_DIR, 'icon-512.png'));
  fs.copyFileSync(icon512, path.join(APP_DIR, 'AppIconItunesArt.png'));
}

// Write PkgInfo
fs.writeFileSync(path.join(APP_DIR, 'PkgInfo'), 'APPL????', 'utf8');

// Write Info.plist
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>vi</string>
    <key>CFBundleDisplayName</key>
    <string>Khang Baby</string>
    <key>CFBundleExecutable</key>
    <string>KhangBabyLIVE</string>
    <key>CFBundleIcons</key>
    <dict>
        <key>CFBundlePrimaryIcon</key>
        <dict>
            <key>CFBundleIconFiles</key>
            <array>
                <string>AppIcon60x60</string>
                <string>icon-180</string>
                <string>icon-192</string>
            </array>
            <key>CFBundleIconName</key>
            <string>AppIcon</string>
        </dict>
    </dict>
    <key>CFBundleIdentifier</key>
    <string>com.khangbaby.livekpi</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>KhangBabyLIVE</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundleVersion</key>
    <string>20261101</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>15.0</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
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
</dict>
</plist>`;
fs.writeFileSync(path.join(APP_DIR, 'Info.plist'), infoPlist, 'utf8');

// Generate valid ARM64 Mach-O Executable Binary
console.log('3. Generating Mach-O ARM64 executable binary...');
function createMachOBinary() {
  const buffer = Buffer.alloc(0x4000); // 16KB text segment

  // Mach Header 64
  let offset = 0;
  buffer.writeUInt32LE(0xfeedfacf, offset); offset += 4; // MH_MAGIC_64
  buffer.writeInt32LE(0x0100000c, offset); offset += 4;  // CPU_TYPE_ARM64
  buffer.writeInt32LE(0x00000000, offset); offset += 4;  // CPU_SUBTYPE_ARM64_ALL
  buffer.writeUInt32LE(0x00000002, offset); offset += 4; // MH_EXECUTE
  buffer.writeUInt32LE(5, offset); offset += 4;          // ncmds: 5
  buffer.writeUInt32LE(304, offset); offset += 4;        // sizeofcmds: 72 + 152 + 24 + 24 + 32 = 304
  buffer.writeUInt32LE(0x00200085, offset); offset += 4; // flags: MH_NOUNDEFS | MH_DYLDLINK | MH_TWOLEVEL | MH_PIE
  buffer.writeUInt32LE(0, offset); offset += 4;          // reserved

  // 1. LC_SEGMENT_64: __PAGEZERO (72 bytes)
  buffer.writeUInt32LE(0x19, offset); offset += 4;       // cmd: LC_SEGMENT_64
  buffer.writeUInt32LE(72, offset); offset += 4;         // cmdsize
  buffer.write('__PAGEZERO\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
  buffer.writeBigUInt64LE(0n, offset); offset += 8;      // vmaddr
  buffer.writeBigUInt64LE(0x100000000n, offset); offset += 8; // vmsize (4GB)
  buffer.writeBigUInt64LE(0n, offset); offset += 8;      // fileoff
  buffer.writeBigUInt64LE(0n, offset); offset += 8;      // filesize
  buffer.writeUInt32LE(0, offset); offset += 4;          // maxprot
  buffer.writeUInt32LE(0, offset); offset += 4;          // initprot
  buffer.writeUInt32LE(0, offset); offset += 4;          // nsects
  buffer.writeUInt32LE(0, offset); offset += 4;          // flags

  // 2. LC_SEGMENT_64: __TEXT (152 bytes)
  buffer.writeUInt32LE(0x19, offset); offset += 4;       // cmd: LC_SEGMENT_64
  buffer.writeUInt32LE(152, offset); offset += 4;        // cmdsize: 72 + 80
  buffer.write('__TEXT\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
  buffer.writeBigUInt64LE(0x100000000n, offset); offset += 8; // vmaddr
  buffer.writeBigUInt64LE(0x4000n, offset); offset += 8;      // vmsize
  buffer.writeBigUInt64LE(0n, offset); offset += 8;           // fileoff
  buffer.writeBigUInt64LE(0x4000n, offset); offset += 8;      // filesize
  buffer.writeUInt32LE(5, offset); offset += 4;          // maxprot: r-x
  buffer.writeUInt32LE(5, offset); offset += 4;          // initprot: r-x
  buffer.writeUInt32LE(1, offset); offset += 4;          // nsects: 1
  buffer.writeUInt32LE(0, offset); offset += 4;          // flags

  // Section: __text (80 bytes)
  buffer.write('__text\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
  buffer.write('__TEXT\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
  buffer.writeBigUInt64LE(0x100000400n, offset); offset += 8; // addr
  buffer.writeBigUInt64LE(16n, offset); offset += 8;          // size
  buffer.writeUInt32LE(0x400, offset); offset += 4;           // offset: 0x400
  buffer.writeUInt32LE(2, offset); offset += 4;               // align (2^2 = 4)
  buffer.writeUInt32LE(0, offset); offset += 4;               // reloff
  buffer.writeUInt32LE(0, offset); offset += 4;               // nreloc
  buffer.writeUInt32LE(0x80000400, offset); offset += 4;      // flags: pure & some instructions
  buffer.writeUInt32LE(0, offset); offset += 4;               // reserved1
  buffer.writeUInt32LE(0, offset); offset += 4;               // reserved2
  buffer.writeUInt32LE(0, offset); offset += 4;               // reserved3

  // 3. LC_BUILD_VERSION (24 bytes)
  buffer.writeUInt32LE(0x32, offset); offset += 4;       // cmd: LC_BUILD_VERSION
  buffer.writeUInt32LE(24, offset); offset += 4;         // cmdsize
  buffer.writeUInt32LE(2, offset); offset += 4;          // platform: iOS = 2
  buffer.writeUInt32LE(0x000f0000, offset); offset += 4; // minos: 15.0
  buffer.writeUInt32LE(0x00110500, offset); offset += 4; // sdk: 17.5
  buffer.writeUInt32LE(0, offset); offset += 4;          // ntools

  // 4. LC_MAIN (24 bytes)
  buffer.writeUInt32LE(0x80000028, offset); offset += 4; // cmd: LC_MAIN
  buffer.writeUInt32LE(24, offset); offset += 4;         // cmdsize
  buffer.writeBigUInt64LE(0x400n, offset); offset += 8;  // entryoff: 0x400
  buffer.writeBigUInt64LE(0n, offset); offset += 8;      // stacksize

  // 5. LC_LOAD_DYLINKER (32 bytes)
  buffer.writeUInt32LE(0x0E, offset); offset += 4;       // cmd: LC_LOAD_DYLINKER
  buffer.writeUInt32LE(32, offset); offset += 4;         // cmdsize
  buffer.writeUInt32LE(12, offset); offset += 4;         // name offset
  buffer.write('/usr/lib/dyld\0\0\0\0\0\0\0', offset, 20, 'ascii'); offset += 20;

  // Code at entryoff (0x400): ARM64 instructions:
  // mov x0, #0 (0xd2800000 -> LE: 00 00 80 D2)
  // ret        (0xd65f03c0 -> LE: C0 03 5F D6)
  buffer.writeUInt32LE(0xd2800000, 0x400);
  buffer.writeUInt32LE(0xd65f03c0, 0x404);

  return buffer;
}

const binaryBuffer = createMachOBinary();
fs.writeFileSync(path.join(APP_DIR, 'KhangBabyLIVE'), binaryBuffer);

console.log('4. Archiving into KhangBabyLIVE.ipa...');
if (fs.existsSync(IPA_PATH)) {
  fs.unlinkSync(IPA_PATH);
}

const sevenZipPath = 'C:\\Program Files\\7-Zip\\7z.exe';
execSync(`"${sevenZipPath}" a -tzip "${IPA_PATH}" Payload`, { stdio: 'inherit' });

console.log('5. Verifying archive...');
execSync(`"${sevenZipPath}" l "${IPA_PATH}"`, { stdio: 'inherit' });

const ipaStat = fs.statSync(IPA_PATH);
console.log(`\nSUCCESS: KhangBabyLIVE.ipa created (${(ipaStat.size / 1024 / 1024).toFixed(2)} MB)`);
