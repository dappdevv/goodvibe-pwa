// Скрипт деплоя GoodVibeNFT и копирования ABI/адреса для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем параметры из переменных окружения или задаём по умолчанию
  const owner =
    process.env.GOODVIBE_OWNER || (await hre.ethers.getSigners())[0].address;
  const baseURI = process.env.GOODVIBE_BASE_URI || "https://goodvibe.live/nft/";

  // Деплой контракта
  const GoodVibeNFT = await hre.ethers.getContractFactory("GoodVibeNFT");
  const goodVibeNFT = await GoodVibeNFT.deploy(owner);
  await goodVibeNFT.waitForDeployment();
  console.log("GoodVibeNFT deployed to:", goodVibeNFT.target);

  // Пути к ABI и адресам
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/GoodVibeNFT.sol/GoodVibeNFT.json"
  );
  const abiDest = path.join(
    __dirname,
    "../src/blockchain/abi/GoodVibeNFT.json"
  );
  const addrDest = path.join(
    __dirname,
    "../src/blockchain/addresses/GoodVibeNFT.json"
  );

  // Копируем ABI
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  // Сохраняем адрес
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: goodVibeNFT.target }, null, 2)
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
