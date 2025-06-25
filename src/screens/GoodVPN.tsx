import { useEffect, useState } from "react";
import GoodVPNAbi from "../blockchain/abi/GoodVPN.json";
import GoodVPNAddress from "../blockchain/addresses/GoodVPN.json";
import { publicClient } from "../blockchain/client";
import { createWalletClientFromPrivateKey } from "../blockchain/client";
import { decryptData } from "../utils/crypto";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { type Address } from "viem";

export default function GoodVPN() {
  // --- состояния для GoodVPN ---
  const [servers, setServers] = useState<any[]>([]);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userSubscriptions, setUserSubscriptions] = useState<
    Record<number, number>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [owner, setOwner] = useState<string>("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  // addServerVPN state
  const [addServer, setAddServer] = useState({
    expiration: 2592000,
    location: "",
    deviceAmount: 1,
    description: "",
    price: "0.01",
  });
  const [addServerLoading, setAddServerLoading] = useState(false);
  // removeServerVPN state
  const [removeServerId, setRemoveServerId] = useState("");
  const [removeServerLoading, setRemoveServerLoading] = useState(false);
  // getSubscription state
  const [subUser, setSubUser] = useState("");
  const [subServerId, setSubServerId] = useState("");
  const [subResult, setSubResult] = useState<number | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  // setDaoServices state
  const [daoServicesAddr, setDaoServicesAddr] = useState("");
  const [daoServicesLoading, setDaoServicesLoading] = useState(false);
  const [currentDaoServices, setCurrentDaoServices] = useState<string>("");
  // --- DAOServices UI state ---
  // const [daoServiceError, setDaoServiceError] = useState("");
  // const [daoServiceSuccess, setDaoServiceSuccess] = useState("");
  // const [addService, setAddService] = useState({ ... });
  // const [addServiceLoading, setAddServiceLoading] = useState(false);
  // const [removeServiceId, setRemoveServiceId] = useState("");
  // const [removeServiceLoading, setRemoveServiceLoading] = useState(false);
  // const [addCommission, setAddCommission] = useState({ ... });
  // const [addCommissionLoading, setAddCommissionLoading] = useState(false);
  // const [removeCommissionId, setRemoveCommissionId] = useState("");
  // const [removeCommissionLoading, setRemoveCommissionLoading] = useState(false);
  // const [payCommission, setPayCommission] = useState({ ... });
  // const [payCommissionLoading, setPayCommissionLoading] = useState(false);
  // const [withdraw, setWithdraw] = useState({ ... });
  // const [withdrawLoading, setWithdrawLoading] = useState(false);
  // const [setCommissionIdLoading, setSetCommissionIdLoading] = useState(false);
  // const [setCommissionIdError, setSetCommissionIdError] = useState("");
  // const [setCommissionIdSuccess, setSetCommissionIdSuccess] = useState("");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  // Добавляю хуки состояния для вывода средств
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  // Получение адреса пользователя из localStorage
  useEffect(() => {
    const sessionId = localStorage.getItem("goodvibe_session_id");
    const encrypted = sessionId
      ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
      : null;
    const pin = localStorage.getItem("goodvibe_pin");
    if (!encrypted || !pin) return;
    (async () => {
      try {
        const decrypted = await decryptData(encrypted, pin);
        const data = JSON.parse(decrypted);
        setUserAddress(data.address);
      } catch {
        setUserAddress("");
      }
    })();
  }, []);
  // Загрузка серверов и подписок
  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const count = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "serversCount",
        });
        const serversArr = [];
        const subs: Record<number, number> = {};
        for (let i = 0; i < Number(count); i++) {
          // Приведение типа для server: [id, created, expiration, location, deviceAmount, description, price, exists]
          const server = (await publicClient.readContract({
            address: GoodVPNAddress.address as Address,
            abi: GoodVPNAbi,
            functionName: "servers",
            args: [i],
          })) as [
            number,
            number,
            number,
            string,
            number,
            string,
            bigint,
            boolean
          ];
          if (server[7]) {
            // exists
            serversArr.push({
              id: Number(server[0]),
              created: Number(server[1]),
              expiration: Number(server[2]),
              location: server[3],
              deviceAmount: Number(server[4]),
              description: server[5],
              price: server[6],
            });
            // Получаем подписку пользователя
            const exp = await publicClient.readContract({
              address: GoodVPNAddress.address as Address,
              abi: GoodVPNAbi,
              functionName: "getSubscription",
              args: [userAddress as Address, i],
            });
            subs[i] = Number(exp);
          }
        }
        setServers(serversArr);
        setUserSubscriptions(subs);
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки серверов");
      }
      setLoading(false);
    })();
  }, [userAddress]);
  // Получить owner
  useEffect(() => {
    (async () => {
      try {
        const o = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "owner",
        });
        setOwner(o as string);
      } catch {}
    })();
  }, []);
  // Получить текущий адрес daoServices
  useEffect(() => {
    (async () => {
      try {
        const addr = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "daoServices",
        });
        setCurrentDaoServices(addr as string);
      } catch {}
    })();
  }, []);
  // Получить баланс пользователя
  useEffect(() => {
    if (!userAddress) return;
    (async () => {
      try {
        const bal = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "balances",
          args: [userAddress as Address],
        });
        setUserBalance((Number(bal) / 1e18).toFixed(4));
      } catch {
        setUserBalance("0");
      }
    })();
  }, [userAddress, loading]);
  // Получить commissionGoodVPN из контракта
  useEffect(() => {
    (async () => {
      try {
        const comm = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "commissionGoodVPN",
        });
        setCommissionGoodVPN(Number(comm));
      } catch {}
    })();
  }, [userAddress, loading]);
  // Функция пополнения баланса
  const handleDeposit = async () => {
    setDepositLoading(true);
    setError("");
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.sendTransaction({
        to: GoodVPNAddress.address as Address,
        value: BigInt(Number(depositAmount) * 1e18),
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      toast("Баланс успешно пополнен!");
      setDepositAmount("");
      // Обновить баланс после пополнения
      setTimeout(() => {
        (async () => {
          try {
            const bal = await publicClient.readContract({
              address: GoodVPNAddress.address as Address,
              abi: GoodVPNAbi,
              functionName: "balances",
              args: [userAddress as Address],
            });
            setUserBalance((Number(bal) / 1e18).toFixed(4));
          } catch {}
        })();
      }, 2000);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Ошибка пополнения баланса");
    }
    setDepositLoading(false);
  };
  // Покупка VPN с учётом комиссии GoodVPN
  const handleBuyVPN = async (serverId: number) => {
    setLoading(true);
    setError("");
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "payVPN",
        args: [serverId],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      toast("Покупка VPN успешна!");
      setUserSubscriptions((prev) => ({
        ...prev,
        [serverId]: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      }));
      // Обновить баланс после покупки
      setTimeout(() => {
        (async () => {
          try {
            const bal = await publicClient.readContract({
              address: GoodVPNAddress.address as Address,
              abi: GoodVPNAbi,
              functionName: "balances",
              args: [userAddress as Address],
            });
            setUserBalance((Number(bal) / 1e18).toFixed(4));
          } catch {}
        })();
      }, 2000);
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Ошибка покупки VPN");
    }
    setLoading(false);
  };
  // addServerVPN
  const handleAddServer = async () => {
    setAdminError("");
    setAdminSuccess("");
    setAddServerLoading(true);
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "addServerVPN",
        args: [
          Number(addServer.expiration),
          addServer.location,
          Number(addServer.deviceAmount),
          addServer.description,
          parseFloat(addServer.price) * 1e18,
        ],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setAdminSuccess("Сервер добавлен!");
      setAddServer({
        expiration: 2592000,
        location: "",
        deviceAmount: 1,
        description: "",
        price: "0.01",
      });
    } catch (e: any) {
      setAdminError(
        e?.shortMessage || e?.message || "Ошибка добавления сервера"
      );
    }
    setAddServerLoading(false);
  };
  // removeServerVPN
  const handleRemoveServer = async () => {
    setAdminError("");
    setAdminSuccess("");
    setRemoveServerLoading(true);
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "removeServerVPN",
        args: [Number(removeServerId)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setAdminSuccess("Сервер удалён!");
      setRemoveServerId("");
    } catch (e: any) {
      setAdminError(e?.shortMessage || e?.message || "Ошибка удаления сервера");
    }
    setRemoveServerLoading(false);
  };
  // getSubscription
  const handleGetSubscription = async () => {
    setSubLoading(true);
    setSubResult(null);
    setAdminError("");
    try {
      const exp = await publicClient.readContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "getSubscription",
        args: [subUser as Address, Number(subServerId)],
      });
      setSubResult(Number(exp));
    } catch (e: any) {
      setAdminError(
        e?.shortMessage || e?.message || "Ошибка получения подписки"
      );
    }
    setSubLoading(false);
  };
  // setDaoServices
  const handleSetDaoServices = async () => {
    setDaoServicesLoading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "setDaoServices",
        args: [daoServicesAddr],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setAdminSuccess("Адрес daoServices обновлён!");
      setDaoServicesAddr("");
    } catch (e: any) {
      setAdminError(
        e?.shortMessage || e?.message || "Ошибка обновления daoServices"
      );
    }
    setDaoServicesLoading(false);
  };
  // Добавляю:
  const [commissionGoodVPN, setCommissionGoodVPN] = useState<number>(10);
  const [commissionInput, setCommissionInput] = useState("");
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState("");
  const [commissionSuccess, setCommissionSuccess] = useState("");
  // Обработчик установки комиссии
  const handleSetCommissionGoodVPN = async () => {
    setCommissionLoading(true);
    setCommissionError("");
    setCommissionSuccess("");
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "setCommissionGoodVPN",
        args: [Number(commissionInput)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setCommissionSuccess("Комиссия успешно обновлена!");
      setCommissionInput("");
      // Обновить commissionGoodVPN
      setTimeout(() => {
        (async () => {
          try {
            const comm = await publicClient.readContract({
              address: GoodVPNAddress.address as Address,
              abi: GoodVPNAbi,
              functionName: "commissionGoodVPN",
            });
            setCommissionGoodVPN(Number(comm));
          } catch {}
        })();
      }, 2000);
    } catch (e: any) {
      setCommissionError(
        e?.shortMessage || e?.message || "Ошибка обновления комиссии"
      );
    }
    setCommissionLoading(false);
  };
  // Обработчик вывода средств
  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    setWithdrawError("");
    setWithdrawSuccess("");
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await walletClient.writeContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "withdraw",
        args: [withdrawAddress, parseFloat(withdrawAmount) * 1e18],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setWithdrawSuccess("Средства успешно выведены!");
      setWithdrawAddress("");
      setWithdrawAmount("");
    } catch (e: any) {
      setWithdrawError(
        e?.shortMessage || e?.message || "Ошибка вывода средств"
      );
    }
    setWithdrawLoading(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-full sm:max-w-lg mx-auto px-2 sm:px-4">
        <CardHeader>
          <CardTitle className="text-lg font-bold">GoodVPN</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <b>GoodVPN</b> — децентрализованный VPN-сервис для участников GOOD
            VIBE DAO.
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {loading ? (
            <div className="text-center text-muted-foreground">
              Загрузка серверов...
            </div>
          ) : (
            <>
              {/* --- Баланс пользователя и пополнение --- */}
              <div className="mb-6 p-4 bg-muted rounded-lg border flex flex-col gap-2">
                <div className="font-semibold">
                  Ваш баланс: {userBalance} ETH
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Текущая комиссия сервиса: {commissionGoodVPN}%
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    className="input input-bordered"
                    placeholder="Сумма (ETH)"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    aria-label="Сумма для пополнения"
                    tabIndex={0}
                    min={0}
                    step={0.0001}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleDeposit}
                    disabled={
                      depositLoading ||
                      !depositAmount ||
                      Number(depositAmount) <= 0
                    }
                    aria-label="Пополнить баланс"
                    tabIndex={0}
                  >
                    {depositLoading ? "Пополнение..." : "Пополнить баланс"}
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {servers.map((srv) => (
                  <div
                    key={srv.id}
                    className="border rounded-lg p-3 bg-white dark:bg-zinc-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="font-semibold">{srv.location}</div>
                        <div className="text-xs text-muted-foreground">
                          {srv.description}
                        </div>
                        <div className="text-xs mt-1">
                          Устройств: {srv.deviceAmount}
                        </div>
                        <div className="text-xs">
                          Длительность: {Math.floor(srv.expiration / 86400)}{" "}
                          дней
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-bold text-primary">
                          {Number(srv.price) / 1e18} ETH
                        </div>
                        {userSubscriptions[srv.id] &&
                        userSubscriptions[srv.id] >
                          Math.floor(Date.now() / 1000) ? (
                          <div className="text-green-600 text-xs">
                            Подписка активна до{" "}
                            {new Date(
                              userSubscriptions[srv.id] * 1000
                            ).toLocaleString()}
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => handleBuyVPN(srv.id)}
                            disabled={loading}
                            aria-label="Купить VPN"
                            tabIndex={0}
                          >
                            Купить VPN
                            {commissionGoodVPN !== null && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (
                                {(
                                  Number(srv.price) / 1e18 +
                                  ((Number(srv.price) / 1e18) *
                                    commissionGoodVPN) /
                                    100
                                ).toFixed(4)}{" "}
                                ETH с комиссией)
                              </span>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* --- UI для владельца GoodVPN --- */}
          {userAddress &&
            owner &&
            userAddress.toLowerCase() === owner.toLowerCase() && (
              <div className="w-full max-w-lg mx-auto mt-10 mb-10 p-4 bg-muted rounded-lg border">
                <h2 className="text-xl font-bold mb-4">Админ-панель GoodVPN</h2>
                {adminError && (
                  <div className="text-red-500 mb-2">{adminError}</div>
                )}
                {adminSuccess && (
                  <div className="text-green-600 mb-2">{adminSuccess}</div>
                )}
                {/* addServerVPN */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Добавить сервер</h3>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-location"
                    >
                      Локация
                    </label>
                    <input
                      id="add-location"
                      type="text"
                      className="input input-bordered"
                      placeholder="Локация"
                      value={addServer.location}
                      onChange={(e) =>
                        setAddServer((s) => ({
                          ...s,
                          location: e.target.value,
                        }))
                      }
                      aria-label="Локация"
                      tabIndex={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-description"
                    >
                      Описание
                    </label>
                    <input
                      id="add-description"
                      type="text"
                      className="input input-bordered"
                      placeholder="Описание"
                      value={addServer.description}
                      onChange={(e) =>
                        setAddServer((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                      aria-label="Описание"
                      tabIndex={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-expiration"
                    >
                      Дней (expiration)
                    </label>
                    <input
                      id="add-expiration"
                      type="number"
                      className="input input-bordered"
                      placeholder="Дней (expiration)"
                      value={addServer.expiration}
                      onChange={(e) =>
                        setAddServer((s) => ({
                          ...s,
                          expiration: Number(e.target.value),
                        }))
                      }
                      aria-label="Дней"
                      tabIndex={0}
                      min={1}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-deviceAmount"
                    >
                      Устройств
                    </label>
                    <input
                      id="add-deviceAmount"
                      type="number"
                      className="input input-bordered"
                      placeholder="Устройств"
                      value={addServer.deviceAmount}
                      onChange={(e) =>
                        setAddServer((s) => ({
                          ...s,
                          deviceAmount: Number(e.target.value),
                        }))
                      }
                      aria-label="Устройств"
                      tabIndex={0}
                      min={1}
                    />
                    <label className="text-xs font-medium" htmlFor="add-price">
                      Цена (ETH)
                    </label>
                    <input
                      id="add-price"
                      type="number"
                      className="input input-bordered"
                      placeholder="Цена (ETH)"
                      value={addServer.price}
                      onChange={(e) =>
                        setAddServer((s) => ({ ...s, price: e.target.value }))
                      }
                      aria-label="Цена"
                      tabIndex={0}
                      min={0}
                      step={0.0001}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleAddServer}
                      disabled={addServerLoading}
                      aria-label="Добавить сервер"
                      tabIndex={0}
                    >
                      {addServerLoading ? "Добавление..." : "Добавить сервер"}
                    </Button>
                  </div>
                </div>
                {/* removeServerVPN */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Удалить сервер</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="ID сервера"
                      value={removeServerId}
                      onChange={(e) => setRemoveServerId(e.target.value)}
                      aria-label="ID сервера"
                      tabIndex={0}
                      min={0}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleRemoveServer}
                      disabled={removeServerLoading}
                      aria-label="Удалить сервер"
                      tabIndex={0}
                    >
                      {removeServerLoading ? "Удаление..." : "Удалить"}
                    </Button>
                  </div>
                </div>
                {/* getSubscription */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Проверить подписку</h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Адрес пользователя"
                      value={subUser}
                      onChange={(e) => setSubUser(e.target.value)}
                      aria-label="Адрес пользователя"
                      tabIndex={0}
                    />
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="ID сервера"
                      value={subServerId}
                      onChange={(e) => setSubServerId(e.target.value)}
                      aria-label="ID сервера"
                      tabIndex={0}
                      min={0}
                    />
                    <Button
                      variant="outline"
                      onClick={handleGetSubscription}
                      disabled={subLoading}
                      aria-label="Проверить подписку"
                      tabIndex={0}
                    >
                      {subLoading ? "Проверка..." : "Проверить"}
                    </Button>
                  </div>
                  {subResult !== null && (
                    <div className="text-sm">
                      Expiration: {subResult} (
                      {subResult > 0
                        ? new Date(subResult * 1000).toLocaleString()
                        : "нет подписки"}
                      )
                    </div>
                  )}
                </div>
                {/* setDaoServices */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">
                    Текущий адрес DAO Services:
                  </h3>
                  <div className="mb-2 break-all text-xs text-muted-foreground">
                    {currentDaoServices}
                  </div>
                  <h3 className="font-semibold mb-2">
                    Установить адрес daoServices
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Адрес daoServices"
                      value={daoServicesAddr}
                      onChange={(e) => setDaoServicesAddr(e.target.value)}
                      aria-label="Адрес daoServices"
                      tabIndex={0}
                    />
                    <Button
                      variant="outline"
                      onClick={handleSetDaoServices}
                      disabled={daoServicesLoading}
                      aria-label="Установить daoServices"
                      tabIndex={0}
                    >
                      {daoServicesLoading ? "Установка..." : "Установить"}
                    </Button>
                  </div>
                </div>
                {/* Вывод средств */}
                <div className="w-full max-w-lg mx-auto mt-10 mb-10 p-4 bg-muted rounded-lg border">
                  <h2 className="text-xl font-bold mb-4">
                    Вывод средств с GoodVPN
                  </h2>
                  {withdrawError && (
                    <div className="text-red-500 mb-2">{withdrawError}</div>
                  )}
                  {withdrawSuccess && (
                    <div className="text-green-600 mb-2">{withdrawSuccess}</div>
                  )}
                  <div className="flex flex-col gap-2 mb-2">
                    <input
                      type="text"
                      className="input input-bordered"
                      placeholder="Адрес получателя (0x...)"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      aria-label="Адрес получателя"
                      tabIndex={0}
                    />
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="Сумма (ETH)"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      aria-label="Сумма для вывода"
                      tabIndex={0}
                      min={0}
                      step={0.0001}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleWithdraw}
                      disabled={
                        withdrawLoading || !withdrawAddress || !withdrawAmount
                      }
                      aria-label="Вывести средства"
                      tabIndex={0}
                    >
                      {withdrawLoading ? "Вывод..." : "Вывести"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          {/* --- UI для владельца: установка комиссии GoodVPN --- */}
          {userAddress &&
            owner &&
            userAddress.toLowerCase() === owner.toLowerCase() && (
              <div className="w-full max-w-lg mx-auto mt-10 mb-10 p-4 bg-muted rounded-lg border">
                <h2 className="text-xl font-bold mb-4">
                  Установить комиссию GoodVPN
                </h2>
                {commissionError && (
                  <div className="text-red-500 mb-2">{commissionError}</div>
                )}
                {commissionSuccess && (
                  <div className="text-green-600 mb-2">{commissionSuccess}</div>
                )}
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="number"
                    className="input input-bordered"
                    placeholder="Процент комиссии"
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    aria-label="Процент комиссии"
                    tabIndex={0}
                    min={0}
                    max={100}
                  />
                  <Button
                    variant="secondary"
                    onClick={handleSetCommissionGoodVPN}
                    disabled={commissionLoading || commissionInput === ""}
                    aria-label="Установить комиссию"
                    tabIndex={0}
                  >
                    {commissionLoading ? "Установка..." : "Установить"}
                  </Button>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
