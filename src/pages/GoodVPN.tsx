import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function GoodVPN() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-lg mx-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
