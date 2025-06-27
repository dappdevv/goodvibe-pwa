// Скрипт деплоя только GoodVPN
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Получаем адрес GoodVibe из файла
  const goodVibeAddrPath = path.join(
    __dirname,
    "../src/blockchain/addresses/GoodVibe.json"
  );
  const goodVibeJson = JSON.parse(fs.readFileSync(goodVibeAddrPath, "utf8"));
  const goodVibeAddress = goodVibeJson.address;

  // Получаем адрес владельца из переменной окружения
  const owner = process.env.DEPLOY_OWNER;
  if (!owner) {
    throw new Error("DEPLOY_OWNER env variable is not set");
  }

  // Деплой GoodVPN
  const GoodVPN = await hre.ethers.getContractFactory("GoodVPN");
  const goodVPN = await GoodVPN.deploy(owner, goodVibeAddress);
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

  // Копируем ABI и адрес
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
  fs.writeFileSync(
    addrDest,
    JSON.stringify({ address: goodVPN.target }, null, 2)
  );
  console.log(`ABI GoodVPN скопирован в:`, abiDest);
  console.log(`Адрес GoodVPN скопирован в:`, addrDest);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
