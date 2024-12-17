import { generateDeviceId, loadProxies, loadFile } from './utils/scripts.js';
import { Gateway } from './utils/gateway.js';
import log from './utils/logger.js';
import banner from './utils/banner.js';

const PROXIES_FILE = 'proxies.txt'
const USERS_FILE = 'userIds.txt'
const SERVER = "gw0.streamapp365.com";
const MAX_GATEWAYS = 32;

async function setupGatewaysForUser(user) {
    const proxies = loadProxies(PROXIES_FILE);
    const numberGateway = proxies.length > MAX_GATEWAYS ? MAX_GATEWAYS : proxies.length;
    const userGateways = [];
    for (let i = 0; i < numberGateway; i++) {
        const proxy = proxies[i % proxies.length];
        try {
            const deviceId = generateDeviceId();
            log.info(`Menghubungkan ke Gateway ${i + 1} untuk Pengguna ${user} menggunakan ID Perangkat: ${deviceId} melalui Proxy: ${proxy}`);

            const gateway = new Gateway(SERVER, user, deviceId, proxy);
            userGateways.push(gateway);

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (err) {
            log.error(`Gagal menghubungkan Gateway ${i + 1} untuk Pengguna ${user}: ${err.message}`);
        }
    }
    return userGateways;
}

async function main() {
    log.info(banner);
    const USERS = loadFile(USERS_FILE)
    try {
        log.info("Menyiapkan gateway untuk semua pengguna...");

        const results = await Promise.allSettled(
            USERS.map((user) => setupGatewaysForUser(user))
        );

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                log.info(`Pengguna ${USERS[index]}: Berhasil menyiapkan ${result.value.length} gateway.`);
            } else {
                log.error(`Pengguna ${USERS[index]}: Gagal menyiapkan gateway. Alasan: ${result.reason}`);
            }
        });

        log.info("Semua pengaturan gateway pengguna telah dicoba.");

        process.on('SIGINT', () => {
            log.info("Membersihkan gateway...");
            results
                .filter(result => result.status === "fulfilled")
                .flatMap(result => result.value)
                .forEach((gateway, index) => {
                    if (gateway.ws) {
                        log.info(`Menutup Gateway ${index + 1}`);
                        gateway.ws.close();
                    }
                });
            process.exit();
        });

    } catch (error) {
        log.error("Terjadi kesalahan tak terduga saat pengaturan gateway:", error);
    }
}

// Jalankan
main().catch((error) => log.error("Terjadi kesalahan tak terduga:", error));