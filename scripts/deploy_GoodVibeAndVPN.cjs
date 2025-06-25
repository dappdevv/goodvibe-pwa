// Скрипт деплоя GoodVibe и GoodVPN и копирования ABI/адресов для фронта
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Деплой GoodVibe
  const GoodVibe = await hre.ethers.getContractFactory("GoodVibe");
  const goodVibe = await GoodVibe.deploy();
  await goodVibe.waitForDeployment();
  console.log("GoodVibe deployed to:", goodVibe.target);

  // Деплой GoodVPN с адресом GoodVibe
  const GoodVPN = await hre.ethers.getContractFactory("GoodVPN");
  // Для конструктора: (address owner, address goodVibe)
  const [deployer] = await hre.ethers.getSigners();
  const goodVPN = await GoodVPN.deploy(deployer.address, goodVibe.target);
  await goodVPN.waitForDeployment();
  console.log("GoodVPN deployed to:", goodVPN.target);

  // Пути к ABI и адресам
  const abis = [
    {
      name: "GoodVibe",
      artifactPath: path.join(
        __dirname,
        "../artifacts/contracts/GoodVibe.sol/GoodVibe.json"
      ),
      abiDest: path.join(__dirname, "../src/blockchain/abi/GoodVibe.json"),
      addrDest: path.join(
        __dirname,
        "../src/blockchain/addresses/GoodVibe.json"
      ),
      address: goodVibe.target,
    },
    {
      name: "GoodVPN",
      artifactPath: path.join(
        __dirname,
        "../artifacts/contracts/GoodVPN.sol/GoodVPN.json"
      ),
      abiDest: path.join(__dirname, "../src/blockchain/abi/GoodVPN.json"),
      addrDest: path.join(
        __dirname,
        "../src/blockchain/addresses/GoodVPN.json"
      ),
      address: goodVPN.target,
    },
  ];

  // Копируем ABI и адреса
  for (const contract of abis) {
    const artifact = JSON.parse(fs.readFileSync(contract.artifactPath, "utf8"));
    fs.writeFileSync(contract.abiDest, JSON.stringify(artifact.abi, null, 2));
    fs.writeFileSync(
      contract.addrDest,
      JSON.stringify({ address: contract.address }, null, 2)
    );
    console.log(`ABI ${contract.name} скопирован в:`, contract.abiDest);
    console.log(`Адрес ${contract.name} скопирован в:`, contract.addrDest);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
