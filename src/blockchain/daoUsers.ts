import { publicClient } from "./client";
import DAOUsersAbi from "./abi/DAOUsers.json";
import daoUsersAddress from "./addresses/DAOUsers.json";
import { type Address, type WalletClient } from "viem";

// Получить данные пользователя из контракта
export async function getUser(address: Address) {
  console.log("getUser вызван с адресом:", address);
  try {
    const result = await publicClient.readContract({
      address: daoUsersAddress.address as Address,
      abi: DAOUsersAbi,
      functionName: "users",
      args: [address],
    });
    console.log("getUser получил результат:", result);
    return result;
  } catch (e) {
    console.error("Ошибка в getUser:", e);
    throw e;
  }
}

// Создать приглашение
export async function createInvite(
  walletClient: WalletClient,
  invitee: Address
) {
  return await walletClient.writeContract({
    address: daoUsersAddress.address as Address,
    abi: DAOUsersAbi,
    functionName: "createInvite",
    args: [invitee],
    chain: walletClient.chain,
    account: walletClient.account ?? null,
  });
}

// Создать верификацию
export async function createVerification(
  walletClient: WalletClient,
  verifier: Address,
  encryptedFullName: string,
  photoCID: string,
  verificationHash: string // hex string
) {
  return await walletClient.writeContract({
    address: daoUsersAddress.address as Address,
    abi: DAOUsersAbi,
    functionName: "createVerification",
    args: [verifier, encryptedFullName, photoCID, verificationHash],
    chain: walletClient.chain,
    account: walletClient.account ?? null,
  });
}

// Получить активную верификацию пользователя
export async function getActiveVerification(address: Address) {
  return await publicClient.readContract({
    address: daoUsersAddress.address as Address,
    abi: DAOUsersAbi,
    functionName: "activeVerifications",
    args: [address],
  });
}

// // Зарегистрировать пользователя
// export async function registerUser(name: string) {
//   return await walletClient.writeContract({
//     address: daoUsersAddress.address as Address,
//     abi: DAOUsersAbi,
//     functionName: "registerUser",
//     args: [name],
//   });
// }
