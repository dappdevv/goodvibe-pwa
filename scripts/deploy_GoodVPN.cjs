// Скрипт деплоя GoodVPN и копирования ABI/адреса для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем параметры из переменных окружения или задаём по умолчанию
  const owner =
    process.env.GOODVPN_OWNER || (await hre.ethers.getSigners())[0].address;
  const daoServices =
    process.env.GOODVPN_DAOSERVICES ||
    (await hre.ethers.getSigners())[1].address;
  const daoPartnerProgram =
    process.env.GOODVPN_DAOPARTNER ||
    (await hre.ethers.getSigners())[2].address;

  // Деплой контракта
  const GoodVPN = await hre.ethers.getContractFactory("GoodVPN");
  const goodVPN = await GoodVPN.deploy(owner, daoServices, daoPartnerProgram);
  await goodVPN.waitForDeployment();
  console.log("GoodVPN deployed to:", goodVPN.target);

  // Пути к ABI и адресам
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/GoodVPN.sol/GoodVPN.json"
  );
  const abiDest = path.join(__dirname, "../src/blockchain/abi/GoodVPN.json");
  const addrDest = path.join(
    __dirname,
    "../src/blockchain/addresses/GoodVPN.json"
  );

  // Копируем ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  // Сохраняем адрес
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: goodVPN.target }, null, 2)
  );

  console.log("ABI скопирован в:", abiDest);
  console.log("Адрес скопирован в:", addrDest);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
