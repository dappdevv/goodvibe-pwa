// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GoodVPN - Контракт оплаты VPN сервиса
/// @author GOOD VIBE DEVELOPMENT
/// @notice Контракт для оплаты VPN, учёта подписок и распределения комиссий по реферальной программе

/// @notice Интерфейс для взаимодействия с контрактом GoodVibe
interface IGoodVibe {
    // Перечисление статусов пользователя
    enum UserStatus {
        None,
        Pending,
        Active,
        Inactive,
        Paused,
        Blocked
    }

    // Структура пользователя
    struct User {
        string name;
        address userAddress;
        UserStatus status;
        uint activity;
        uint level;
        address referrer;
        uint registered;
        uint rating;
        uint verificationsCount;
    }

    /// @notice Получить данные пользователя
    function users(address user) external view returns (User memory);

    /// @notice Проверить, зарегистрирован ли пользователь
    function isUserRegistered(address user) external view returns (bool);

    /// @notice Получить статус пользователя
    function getUserStatus(address user) external view returns (UserStatus);

    /// @notice Получить массив рефералов первого уровня пользователя
    function getFirstLevelReferrals(address user) external view returns (address[] memory);

    /// @notice Получить адрес основателя
    function getFounder() external view returns (address);
}

contract GoodVPN is Ownable, ReentrancyGuard {
    /// @notice Структура VPN сервера
    struct ServerVPN {
        uint256 id;
        uint256 created;
        uint256 expiration;
        string location;
        uint256 deviceAmount;
        string description;
        uint256 price;
        bool exists;
    }

    /// @notice Структура подписки пользователя
    struct Subscription {
        uint256 expiration;
    }

    /// @notice События
    event ServerVPNAdded(uint256 indexed id, string location, uint256 price);
    event ServerVPNRemoved(uint256 indexed id);
    event VPNPaid(address indexed user, uint256 indexed serverId, uint256 expiration, uint256 amount, uint256 commissionAmount);

    /// @notice Маппинг id сервера к структуре
    mapping(uint256 => ServerVPN) public servers;
    uint256 public serversCount;

    /// @notice Маппинг адреса пользователя к id сервера к подписке
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;

    /// @notice Адрес контракта GoodVibe
    address public goodVibe;
    /// @notice Процент комиссии GoodVPN (по умолчанию 10)
    uint256 public commissionGoodVPN = 10;

    /// @notice Маппинг балансов пользователей
    mapping(address => uint256) public balances;

    /// @notice Модификатор для проверки активного пользователя GoodVibe
    modifier onlyActiveUser() {
        require(IGoodVibe(goodVibe).isUserRegistered(msg.sender), "User not registered in GoodVibe");
        require(IGoodVibe(goodVibe).getUserStatus(msg.sender) == IGoodVibe.UserStatus.Active, "User not active in GoodVibe");
        _;
    }

    /// @notice Конструктор
    /// @param _owner адрес владельца
    /// @param _goodVibe адрес контракта GoodVibe
    constructor(address _owner, address _goodVibe) Ownable(_owner) {
        require(_owner != address(0), "Invalid owner address");
        require(_goodVibe != address(0), "Invalid GoodVibe address");
        goodVibe = _goodVibe;
        // Добавляем тестовый сервер VPN при деплое
        servers[serversCount] = ServerVPN({
            id: serversCount,
            created: block.timestamp,
            expiration: 333 days,
            location: "Test Location",
            deviceAmount: 10,
            description: "Test VPN Server",
            price: 0.1 ether,
            exists: true
        });
        emit ServerVPNAdded(serversCount, "Test Location", 0.1 ether);
        serversCount++;
    }

    /// @notice Добавить VPN сервер (только владелец)
    function addServerVPN(
        uint256 expiration,
        string calldata location,
        uint256 deviceAmount,
        string calldata description,
        uint256 price
    ) external onlyOwner {
        servers[serversCount] = ServerVPN({
            id: serversCount,
            created: block.timestamp,
            expiration: expiration,
            location: location,
            deviceAmount: deviceAmount,
            description: description,
            price: price,
            exists: true
        });
        emit ServerVPNAdded(serversCount, location, price);
        serversCount++;
    }

    /// @notice Удалить VPN сервер (только владелец)
    function removeServerVPN(uint256 serverId) external onlyOwner {
        require(servers[serverId].exists, "Server does not exist");
        delete servers[serverId];
        emit ServerVPNRemoved(serverId);
    }

    /// @notice Оплатить VPN услугу с баланса пользователя (только активные пользователи GoodVibe)
    /// @param serverId id сервера
    function payVPN(uint256 serverId) external nonReentrant onlyActiveUser {
        ServerVPN storage server = servers[serverId];
        require(server.exists, "Server does not exist");
        require(server.price > 0, "Server price is zero");

        // Используем commissionGoodVPN
        uint256 commissionAmount = (server.price * commissionGoodVPN) / 100;
        uint256 totalAmount = server.price + commissionAmount;
        require(balances[msg.sender] >= totalAmount, "Insufficient user balance");

        // Списываем средства с баланса пользователя
        balances[msg.sender] -= totalAmount;

        // Комиссия остаётся на контракте GoodVPN
        // Обновляем подписку пользователя
        subscriptions[msg.sender][serverId].expiration = block.timestamp + server.expiration;

        // Распределяем оставшуюся сумму по реферальной программе
        uint256 toDistribute = server.price;
        _distributeReferralRewards(msg.sender, toDistribute);

        emit VPNPaid(msg.sender, serverId, subscriptions[msg.sender][serverId].expiration, totalAmount, commissionAmount);
    }

    /// @dev Внутренняя функция распределения комиссионных по реферальной программе
    function _distributeReferralRewards(address user, uint256 amount) internal {
        // Комиссионные по уровням: [30, 10, 5, 5, 5, 5, 10, 30]
        uint256[8] memory percents = [uint256(30), 10, 5, 5, 5, 5, 10, 30];
        address current = user;
        address founder = IGoodVibe(goodVibe).getFounder(); // Получаем адрес основателя
        
        for (uint256 level = 0; level < 8; level++) {
            // Получаем данные пользователя из GoodVibe
            IGoodVibe.User memory userData = IGoodVibe(goodVibe).users(current);
            
            // Если дошли до пользователя без реферера
            if (userData.referrer == address(0)) {
                // Если это основатель — начисляем ему награду
                if (current == founder && userData.status == IGoodVibe.UserStatus.Active) {
                    uint256 reward = (amount * percents[level]) / 100;
                    // Начисляем на баланс основателя
                    balances[current] += reward;
                }
                break;
            }
            // Проверяем, что реферер активен (статус Active)
            if (userData.status == IGoodVibe.UserStatus.Active) {
                uint256 reward = (amount * percents[level]) / 100;
                // Начисляем на баланс реферера
                balances[userData.referrer] += reward;
            }
            current = userData.referrer;
        }
    }

    /// @dev Проверка, есть ли у пользователя активная подписка хотя бы на один сервер
    function _hasActiveSubscription(address user) internal view returns (bool) {
        for (uint256 i = 0; i < serversCount; i++) {
            if (subscriptions[user][i].expiration > block.timestamp) {
                return true;
            }
        }
        return false;
    }

    /// @notice Получить данные о подписке пользователя
    function getSubscription(address user, uint256 serverId) external view returns (uint256 expiration) {
        return subscriptions[user][serverId].expiration;
    }

    /// @notice Пользователь может вывести свои средства с баланса
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(amount <= balances[msg.sender], "Insufficient user balance");
        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");
    }

    /// @notice Владелец может вывести средства с контракта (только для owner)
    function withdrawOwner(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdraw failed");
    }

    /// @notice Установить адрес контракта GoodVibe (только владелец)
    function setGoodVibeAddress(address _goodVibe) external onlyOwner {
        require(_goodVibe != address(0), "Invalid GoodVibe address");
        goodVibe = _goodVibe;
    }

    /// @notice Позволяет принимать ETH напрямую и пополнять баланс пользователя
    receive() external payable {
        // Пополняем баланс отправителя
        balances[msg.sender] += msg.value;
    }

    /// @notice Установить процент комиссии GoodVPN (только владелец)
    /// @param newCommission новый процент комиссии
    function setCommissionGoodVPN(uint256 newCommission) external onlyOwner {
        require(newCommission <= 100, "Commission must be <= 100");
        commissionGoodVPN = newCommission;
    }
} 