import { publicClient } from "./client";
import DAOUsersAbi from "./abi/DAOUsers.json";
import daoUsersAddress from "./addresses/DAOUsers.json";
import { type Address } from "viem";

// Получить данные пользователя из контракта
export async function getUser(address: Address) {
  return await publicClient.readContract({
    address: daoUsersAddress.address as Address,
    abi: DAOUsersAbi,
    functionName: "users",
    args: [address],
  });
}

// // Создать приглашение
// export async function createInvite(invitee: Address) {
//   return await walletClient.writeContract({
//     address: daoUsersAddress.address as Address,
//     abi: DAOUsersAbi,
//     functionName: "createInvite",
//     args: [invitee],
//   });
// }

// // Зарегистрировать пользователя
// export async function registerUser(name: string) {
//   return await walletClient.writeContract({
//     address: daoUsersAddress.address as Address,
//     abi: DAOUsersAbi,
//     functionName: "registerUser",
//     args: [name],
//   });
// }
