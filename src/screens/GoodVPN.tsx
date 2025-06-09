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
import DAOServicesAbi from "../blockchain/abi/DAOServices.json";
import DAOServicesAddress from "../blockchain/addresses/DAOServices.json";

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
  const [daoServiceError, setDaoServiceError] = useState("");
  const [daoServiceSuccess, setDaoServiceSuccess] = useState("");
  const [addService, setAddService] = useState({
    name: "",
    serviceAddress: "",
  });
  const [addServiceLoading, setAddServiceLoading] = useState(false);
  const [removeServiceId, setRemoveServiceId] = useState("");
  const [removeServiceLoading, setRemoveServiceLoading] = useState(false);
  const [addCommission, setAddCommission] = useState({ name: "", value: "" });
  const [addCommissionLoading, setAddCommissionLoading] = useState(false);
  const [removeCommissionId, setRemoveCommissionId] = useState("");
  const [removeCommissionLoading, setRemoveCommissionLoading] = useState(false);
  const [payCommission, setPayCommission] = useState({
    commissionId: "",
    amount: "",
  });
  const [payCommissionLoading, setPayCommissionLoading] = useState(false);
  const [withdraw, setWithdraw] = useState({ to: "", amount: "" });
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [daoBalance, setDaoBalance] = useState<string>("");
  const [daoServicesList, setDaoServicesList] = useState<any[]>([]);
  const [daoCommissionsList, setDaoCommissionsList] = useState<any[]>([]);
  const [daoListLoading, setDaoListLoading] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState<number | null>(
    null
  );
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
  // Получить баланс DAOServices
  useEffect(() => {
    (async () => {
      try {
        const bal = await publicClient.readContract({
          address: DAOServicesAddress.address as Address,
          abi: DAOServicesAbi,
          functionName: "getBalance",
        });
        setDaoBalance((Number(bal) / 1e18).toFixed(4) + " ETH");
      } catch {}
    })();
  }, []);
  // Загрузка списка сервисов и комиссий
  const loadDaoLists = async () => {
    setDaoListLoading(true);
    try {
      // Сервисы
      const servicesCount = await publicClient.readContract({
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "servicesCount",
      });
      const servicesArr = [];
      for (let i = 0; i < Number(servicesCount); i++) {
        const s = (await publicClient.readContract({
          address: DAOServicesAddress.address as Address,
          abi: DAOServicesAbi,
          functionName: "services",
          args: [i],
        })) as [string, string, boolean];
        if (s[2]) servicesArr.push({ id: i, name: s[0], address: s[1] });
      }
      setDaoServicesList(servicesArr);
      // Комиссии
      const commissionsCount = await publicClient.readContract({
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "commissionsCount",
      });
      const commissionsArr = [];
      for (let i = 0; i < Number(commissionsCount); i++) {
        const c = (await publicClient.readContract({
          address: DAOServicesAddress.address as Address,
          abi: DAOServicesAbi,
          functionName: "commissions",
          args: [i],
        })) as [string, number, boolean];
        if (c[2]) commissionsArr.push({ id: i, name: c[0], value: c[1] });
      }
      setDaoCommissionsList(commissionsArr);
    } catch {}
    setDaoListLoading(false);
  };
  // Загружать при открытии админки
  useEffect(() => {
    loadDaoLists();
  }, []);
  // Получить комиссию для каждого сервера
  useEffect(() => {
    (async () => {
      try {
        // Получить commissionId из GoodVPN
        const commissionId = await publicClient.readContract({
          address: GoodVPNAddress.address as Address,
          abi: GoodVPNAbi,
          functionName: "goodVPNCommissionId",
        });
        // Получить комиссию из DAOServices
        const [, percent, exists] = (await publicClient.readContract({
          address: DAOServicesAddress.address as Address,
          abi: DAOServicesAbi,
          functionName: "commissions",
          args: [commissionId],
        })) as [string, number, boolean];
        if (exists) {
          setCommissionPercent(Number(percent));
        }
      } catch {}
    })();
  }, [servers.length]);
  // Покупка VPN с учётом комиссии
  const handleBuyVPN = async (serverId: number, price: number) => {
    setLoading(true);
    setError("");
    try {
      // Получить commissionId и процент
      const commissionId = await publicClient.readContract({
        address: GoodVPNAddress.address as Address,
        abi: GoodVPNAbi,
        functionName: "goodVPNCommissionId",
      });
      const [, percent, exists] = (await publicClient.readContract({
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "commissions",
        args: [commissionId],
      })) as [string, number, boolean];
      if (!exists) throw new Error("Комиссия не найдена");
      const commission = (price * Number(percent)) / 100;
      const total = price + commission;
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
        value: BigInt(Math.floor(total)),
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      toast("Покупка VPN успешна!");
      setUserSubscriptions((prev) => ({
        ...prev,
        [serverId]: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      }));
    } catch (e: any) {
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
  // addService
  const handleAddService = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setAddServiceLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "addService",
        args: [addService.name, addService.serviceAddress],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Сервис добавлен!");
      setAddService({ name: "", serviceAddress: "" });
    } catch (e: any) {
      setDaoServiceError(
        e?.shortMessage || e?.message || "Ошибка добавления сервиса"
      );
    }
    setAddServiceLoading(false);
  };
  // removeService
  const handleRemoveService = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setRemoveServiceLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "removeService",
        args: [Number(removeServiceId)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Сервис удалён!");
      setRemoveServiceId("");
    } catch (e: any) {
      setDaoServiceError(
        e?.shortMessage || e?.message || "Ошибка удаления сервиса"
      );
    }
    setRemoveServiceLoading(false);
  };
  // addCommission
  const handleAddCommission = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setAddCommissionLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "addCommission",
        args: [addCommission.name, Number(addCommission.value)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Комиссия добавлена!");
      setAddCommission({ name: "", value: "" });
    } catch (e: any) {
      setDaoServiceError(
        e?.shortMessage || e?.message || "Ошибка добавления комиссии"
      );
    }
    setAddCommissionLoading(false);
  };
  // removeCommission
  const handleRemoveCommission = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setRemoveCommissionLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "removeCommission",
        args: [Number(removeCommissionId)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Комиссия удалена!");
      setRemoveCommissionId("");
    } catch (e: any) {
      setDaoServiceError(
        e?.shortMessage || e?.message || "Ошибка удаления комиссии"
      );
    }
    setRemoveCommissionLoading(false);
  };
  // payCommission
  const handlePayCommission = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setPayCommissionLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "payCommission",
        args: [Number(payCommission.commissionId)],
        value: BigInt(Number(payCommission.amount) * 1e18),
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Комиссия оплачена!");
      setPayCommission({ commissionId: "", amount: "" });
    } catch (e: any) {
      setDaoServiceError(
        e?.shortMessage || e?.message || "Ошибка оплаты комиссии"
      );
    }
    setPayCommissionLoading(false);
  };
  // withdraw
  const handleWithdraw = async () => {
    setDaoServiceError("");
    setDaoServiceSuccess("");
    setWithdrawLoading(true);
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
        address: DAOServicesAddress.address as Address,
        abi: DAOServicesAbi,
        functionName: "withdraw",
        args: [withdraw.to, BigInt(Number(withdraw.amount) * 1e18)],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setDaoServiceSuccess("Вывод средств выполнен!");
      setWithdraw({ to: "", amount: "" });
    } catch (e: any) {
      setDaoServiceError(
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
              {servers.length === 0 && (
                <div className="text-muted-foreground">
                  Нет доступных серверов
                </div>
              )}
              {servers.length > 0 && (
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
                              onClick={() =>
                                handleBuyVPN(srv.id, Number(srv.price))
                              }
                              disabled={loading}
                              aria-label="Купить VPN"
                              tabIndex={0}
                            >
                              Купить VPN
                              {commissionPercent !== null && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (
                                  {(
                                    Number(srv.price) / 1e18 +
                                    ((Number(srv.price) / 1e18) *
                                      commissionPercent) /
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
              )}
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
              </div>
            )}
          {/* --- DAOServices UI --- */}
          {userAddress &&
            owner &&
            userAddress.toLowerCase() === owner.toLowerCase() && (
              <div className="w-full max-w-lg mx-auto mt-10 mb-10 p-4 bg-muted rounded-lg border">
                <h2 className="text-xl font-bold mb-4">
                  Управление DAOServices
                </h2>
                <div className="mb-2 text-xs text-muted-foreground">
                  Баланс контракта: {daoBalance}
                </div>
                <Button
                  variant="outline"
                  className="mb-4"
                  onClick={loadDaoLists}
                  disabled={daoListLoading}
                  aria-label="Обновить списки"
                  tabIndex={0}
                >
                  {daoListLoading ? "Обновление..." : "Обновить списки"}
                </Button>
                {daoServiceError && (
                  <div className="text-red-500 mb-2">{daoServiceError}</div>
                )}
                {daoServiceSuccess && (
                  <div className="text-green-600 mb-2">{daoServiceSuccess}</div>
                )}
                {/* Список сервисов */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Сервисы</h3>
                  {daoListLoading ? (
                    <div className="text-muted-foreground">Загрузка...</div>
                  ) : (
                    <ul className="text-xs space-y-1">
                      {daoServicesList.length === 0 && <li>Нет сервисов</li>}
                      {daoServicesList.map((s) => (
                        <li key={s.id} className="break-all">
                          ID: {s.id} | {s.name} | {s.address}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Список комиссий */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Комиссии</h3>
                  {daoListLoading ? (
                    <div className="text-muted-foreground">Загрузка...</div>
                  ) : (
                    <ul className="text-xs space-y-1">
                      {daoCommissionsList.length === 0 && <li>Нет комиссий</li>}
                      {daoCommissionsList.map((c) => (
                        <li key={c.id}>
                          ID: {c.id} | {c.name} | {c.value}%
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* addService */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Добавить сервис</h3>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-service-name"
                    >
                      Название
                    </label>
                    <input
                      id="add-service-name"
                      type="text"
                      className="input input-bordered"
                      placeholder="Название"
                      value={addService.name}
                      onChange={(e) =>
                        setAddService((s) => ({ ...s, name: e.target.value }))
                      }
                      aria-label="Название"
                      tabIndex={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-service-address"
                    >
                      Адрес сервиса
                    </label>
                    <input
                      id="add-service-address"
                      type="text"
                      className="input input-bordered"
                      placeholder="Адрес сервиса"
                      value={addService.serviceAddress}
                      onChange={(e) =>
                        setAddService((s) => ({
                          ...s,
                          serviceAddress: e.target.value,
                        }))
                      }
                      aria-label="Адрес сервиса"
                      tabIndex={0}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleAddService}
                      disabled={addServiceLoading}
                      aria-label="Добавить сервис"
                      tabIndex={0}
                    >
                      {addServiceLoading ? "Добавление..." : "Добавить сервис"}
                    </Button>
                  </div>
                </div>
                {/* removeService */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Удалить сервис</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="ID сервиса"
                      value={removeServiceId}
                      onChange={(e) => setRemoveServiceId(e.target.value)}
                      aria-label="ID сервиса"
                      tabIndex={0}
                      min={0}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleRemoveService}
                      disabled={removeServiceLoading}
                      aria-label="Удалить сервис"
                      tabIndex={0}
                    >
                      {removeServiceLoading ? "Удаление..." : "Удалить"}
                    </Button>
                  </div>
                </div>
                {/* addCommission */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Добавить комиссию</h3>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-commission-name"
                    >
                      Название
                    </label>
                    <input
                      id="add-commission-name"
                      type="text"
                      className="input input-bordered"
                      placeholder="Название"
                      value={addCommission.name}
                      onChange={(e) =>
                        setAddCommission((s) => ({
                          ...s,
                          name: e.target.value,
                        }))
                      }
                      aria-label="Название"
                      tabIndex={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="add-commission-value"
                    >
                      Значение (%)
                    </label>
                    <input
                      id="add-commission-value"
                      type="number"
                      className="input input-bordered"
                      placeholder="Значение (%)"
                      value={addCommission.value}
                      onChange={(e) =>
                        setAddCommission((s) => ({
                          ...s,
                          value: e.target.value,
                        }))
                      }
                      aria-label="Значение"
                      tabIndex={0}
                      min={1}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleAddCommission}
                      disabled={addCommissionLoading}
                      aria-label="Добавить комиссию"
                      tabIndex={0}
                    >
                      {addCommissionLoading
                        ? "Добавление..."
                        : "Добавить комиссию"}
                    </Button>
                  </div>
                </div>
                {/* removeCommission */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Удалить комиссию</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input input-bordered"
                      placeholder="ID комиссии"
                      value={removeCommissionId}
                      onChange={(e) => setRemoveCommissionId(e.target.value)}
                      aria-label="ID комиссии"
                      tabIndex={0}
                      min={0}
                    />
                    <Button
                      variant="destructive"
                      onClick={handleRemoveCommission}
                      disabled={removeCommissionLoading}
                      aria-label="Удалить комиссию"
                      tabIndex={0}
                    >
                      {removeCommissionLoading ? "Удаление..." : "Удалить"}
                    </Button>
                  </div>
                </div>
                {/* payCommission */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Оплатить комиссию</h3>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="pay-commission-id"
                    >
                      ID комиссии
                    </label>
                    <input
                      id="pay-commission-id"
                      type="number"
                      className="input input-bordered"
                      placeholder="ID комиссии"
                      value={payCommission.commissionId}
                      onChange={(e) =>
                        setPayCommission((s) => ({
                          ...s,
                          commissionId: e.target.value,
                        }))
                      }
                      aria-label="ID комиссии"
                      tabIndex={0}
                      min={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="pay-commission-amount"
                    >
                      Сумма (ETH)
                    </label>
                    <input
                      id="pay-commission-amount"
                      type="number"
                      className="input input-bordered"
                      placeholder="Сумма (ETH)"
                      value={payCommission.amount}
                      onChange={(e) =>
                        setPayCommission((s) => ({
                          ...s,
                          amount: e.target.value,
                        }))
                      }
                      aria-label="Сумма"
                      tabIndex={0}
                      min={0}
                      step={0.0001}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handlePayCommission}
                      disabled={payCommissionLoading}
                      aria-label="Оплатить комиссию"
                      tabIndex={0}
                    >
                      {payCommissionLoading ? "Оплата..." : "Оплатить комиссию"}
                    </Button>
                  </div>
                </div>
                {/* withdraw */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Вывести средства</h3>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="withdraw-to"
                    >
                      Адрес получателя
                    </label>
                    <input
                      id="withdraw-to"
                      type="text"
                      className="input input-bordered"
                      placeholder="Адрес получателя"
                      value={withdraw.to}
                      onChange={(e) =>
                        setWithdraw((s) => ({ ...s, to: e.target.value }))
                      }
                      aria-label="Адрес получателя"
                      tabIndex={0}
                    />
                    <label
                      className="text-xs font-medium"
                      htmlFor="withdraw-amount"
                    >
                      Сумма (ETH)
                    </label>
                    <input
                      id="withdraw-amount"
                      type="number"
                      className="input input-bordered"
                      placeholder="Сумма (ETH)"
                      value={withdraw.amount}
                      onChange={(e) =>
                        setWithdraw((s) => ({ ...s, amount: e.target.value }))
                      }
                      aria-label="Сумма"
                      tabIndex={0}
                      min={0}
                      step={0.0001}
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleWithdraw}
                      disabled={withdrawLoading}
                      aria-label="Вывести средства"
                      tabIndex={0}
                    >
                      {withdrawLoading ? "Вывод..." : "Вывести средства"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
