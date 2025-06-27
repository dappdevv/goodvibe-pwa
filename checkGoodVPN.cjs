// Скрипт для быстрой диагностики проблем с покупкой VPN
// Комментарии на русском

const { createPublicClient, http } = require("viem");
const GoodVPNAbi = require("./src/blockchain/abi/GoodVPN.json");
const GoodVibeAbi = require("./src/blockchain/abi/GoodVibe.json");

// --- Настройки ---
// RPC URL вашей сети (замените на свой, если нужно)
const RPC_URL = "https://e1bphgmy9w-e1he00x70n-rpc.eu1-azure.kaleido.io/";
const RPC_URL_AUTHORIZATION =
  "Basic ZTF1cndvMHN0NTpRRXU2UWlwUUpBZXdld2VaMTloNFhUVVlfTjV1Mm5tU0tvMTdWZkNuZy1z"; // <-- Вставьте ваш токен авторизации
// Адреса контрактов
const GOODVPN_ADDRESS = "0xD41532fd1048216Eb00035c14276ff8926fe07ad";
const GOODVIBE_ADDRESS = "0xe5C3551978A4F6363Ca92D7E3c94F629FC63f992"; // <-- Вставьте актуальный адрес GoodVibe
// Адрес пользователя
const USER_ADDRESS = "0xE5Ab07AF8EcB71513Cf762F1b2d947F26e75eC01";
// ID сервера
const SERVER_ID = 0;

// --- Создаём клиента с авторизацией ---
const client = createPublicClient({
  transport: http(RPC_URL, {
    fetchOptions: {
      headers: {
        Authorization: RPC_URL_AUTHORIZATION,
      },
    },
  }),
});

// --- Основная функция ---
async function printReferralChain(address) {
  let current = address;
  for (let level = 0; level < 8; level++) {
    const user = await client.readContract({
      address: GOODVIBE_ADDRESS,
      abi: GoodVibeAbi,
      functionName: "users",
      args: [current],
    });
    const referrer = user[5];
    const status = user[2];
    console.log(
      `Уровень ${level}: ${current} | статус: ${status} (${
        status == 2 ? "Active" : "NOT active"
      }) | реферер: ${referrer}`
    );
    if (
      referrer === "0x0000000000000000000000000000000000000000" ||
      referrer.toLowerCase() === current.toLowerCase()
    ) {
      break;
    }
    current = referrer;
  }
}

async function main() {
  try {
    // 1. Проверяем регистрацию пользователя
    const isRegistered = await client.readContract({
      address: GOODVIBE_ADDRESS,
      abi: GoodVibeAbi,
      functionName: "isUserRegistered",
      args: [USER_ADDRESS],
    });
    console.log("Пользователь зарегистрирован:", isRegistered);

    // 2. Получаем статус пользователя
    const status = await client.readContract({
      address: GOODVIBE_ADDRESS,
      abi: GoodVibeAbi,
      functionName: "getUserStatus",
      args: [USER_ADDRESS],
    });
    console.log("Статус пользователя:", status, "(2 = Active)");

    // 3. Проверяем сервер
    const server = await client.readContract({
      address: GOODVPN_ADDRESS,
      abi: GoodVPNAbi,
      functionName: "servers",
      args: [SERVER_ID],
    });
    console.log("Сервер:", server);

    // 4. Проверяем баланс пользователя
    const balance = await client.readContract({
      address: GOODVPN_ADDRESS,
      abi: GoodVPNAbi,
      functionName: "balances",
      args: [USER_ADDRESS],
    });
    console.log("Баланс пользователя:", Number(balance) / 1e18, "ETH");

    // 5. Получаем комиссию
    const commission = await client.readContract({
      address: GOODVPN_ADDRESS,
      abi: GoodVPNAbi,
      functionName: "commissionGoodVPN",
    });
    console.log("Комиссия GoodVPN:", Number(commission), "%");

    // 6. Считаем, хватает ли баланса
    const price = Number(server[6]);
    const commissionAmount = (price * Number(commission)) / 100;
    const total = price + commissionAmount;
    console.log("Цена сервера:", price / 1e18, "ETH");
    console.log("Сумма с комиссией:", total / 1e18, "ETH");
    console.log("Достаточно ли баланса:", Number(balance) >= total);

    // 7. Проверяем exists
    console.log("Сервер существует:", server[7]);

    const goodVibeAddr = await client.readContract({
      address: GOODVPN_ADDRESS,
      abi: GoodVPNAbi,
      functionName: "goodVibe",
    });
    console.log("Адрес GoodVibe в GoodVPN:", goodVibeAddr);

    // Получаем структуру пользователя
    const user = await client.readContract({
      address: GOODVIBE_ADDRESS,
      abi: GoodVibeAbi,
      functionName: "users",
      args: [USER_ADDRESS],
    });
    console.log("User struct:", user);

    // Получаем первого реферера
    const referrer = user[5];
    console.log("Реферер пользователя:", referrer);

    // Если есть реферер, получаем его статус
    if (referrer !== "0x0000000000000000000000000000000000000000") {
      const refStatus = await client.readContract({
        address: GOODVIBE_ADDRESS,
        abi: GoodVibeAbi,
        functionName: "getUserStatus",
        args: [referrer],
      });
      console.log("Статус реферера:", refStatus, "(2 = Active)");
    }

    await printReferralChain(USER_ADDRESS);
  } catch (e) {
    console.error("Ошибка:", e);
  }
}

main();
