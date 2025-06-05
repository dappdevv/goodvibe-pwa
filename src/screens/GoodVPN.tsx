import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GoodVPN() {
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
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Анонимный и безопасный доступ к интернету</li>
            <li>Без логов и цензуры</li>
            <li>Доступ только для членов DAO</li>
            <li>Интеграция с Web3-кошельком</li>
            <li>Скоро: выбор серверов, статистика, оплата токенами</li>
          </ul>
          <div className="mt-6 text-sm text-muted-foreground">
            Подключение и инструкции появятся в ближайших обновлениях.
          </div>
          <Button
            className="mt-6 w-full"
            onClick={async () => {
              const cid = import.meta.env.VITE_GOOD_VPN_CID;
              let endpoint = import.meta.env.VITE_IPFS_ENDPOINT + "cat/" + cid;
              let fetchOptions: RequestInit = { method: "POST" };
              if (import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION) {
                fetchOptions.headers = {
                  ...(fetchOptions.headers || {}),
                  Authorization: import.meta.env
                    .VITE_IPFS_ENDPOINT_AUTHORIZATION,
                };
              }
              try {
                const response = await fetch(endpoint, fetchOptions);
                if (!response.ok) throw new Error("Ошибка загрузки файла");
                const blob = await response.blob();
                const urlObj = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = urlObj;
                a.download = "GoodVPN.apk";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(urlObj);
              } catch (e) {
                const err = e as any;
                alert(
                  "Ошибка скачивания файла: " +
                    (err && err.message ? err.message : String(e))
                );
              }
            }}
          >
            Скачать GoodVPN
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
