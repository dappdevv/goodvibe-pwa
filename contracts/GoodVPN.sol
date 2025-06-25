// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GoodVPN - Контракт оплаты VPN сервиса
/// @author GOOD VIBE LIVE DEVELOPMENT
/// @notice Контракт для оплаты VPN, учёта подписок и распределения комиссий по реферальной программе

/// @notice Интерфейс для взаимодействия с контрактом GoodVibeLive
interface IGoodVibeLive {
    /// @notice Получить данные пользователя
    function users(address) external view returns (
        string memory name,
        address userAddress,
        uint8 status,
        uint activity,
        uint level,
        address referrer,
        uint registered,
        uint rating,
        uint verificationsCount,
        address[] memory firstLevelReferrals
    );
    
    /// @notice Проверить, зарегистрирован ли пользователь
    function isUserRegistered(address) external view returns (bool);

    /// @notice Получить статус пользователя
    function getUserStatus(address) external view returns (uint8);
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

    /// @notice Адрес контракта GoodVibeLive
    address public goodVibeLive;
    /// @notice Процент комиссии GoodVPN (по умолчанию 10)
    uint256 public commissionGoodVPN = 10;

    /// @notice Маппинг балансов пользователей
    mapping(address => uint256) public balances;

    /// @notice Модификатор для проверки активного пользователя GoodVibeLive
    modifier onlyActiveUser() {
        require(IGoodVibeLive(goodVibeLive).isUserRegistered(msg.sender), "User not registered in GoodVibeLive");
        require(IGoodVibeLive(goodVibeLive).getUserStatus(msg.sender) == 2, "User not active in GoodVibeLive"); // 2 = Active status
        _;
    }

    /// @notice Конструктор
    /// @param _owner адрес владельца
    /// @param _goodVibeLive адрес контракта GoodVibeLive
    constructor(address _owner, address _goodVibeLive) Ownable(_owner) {
        require(_owner != address(0), "Invalid owner address");
        require(_goodVibeLive != address(0), "Invalid GoodVibeLive address");
        goodVibeLive = _goodVibeLive;
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

    /// @notice Оплатить VPN услугу с баланса пользователя (только активные пользователи GoodVibeLive)
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
        
        for (uint256 level = 0; level < 8; level++) {
            // Получаем данные пользователя из GoodVibeLive
            (,, uint8 status, , , address referrer, , , , ) = IGoodVibeLive(goodVibeLive).users(current);
            
            if (referrer == address(0)) break; // Нет реферера
            
            // Проверяем, что реферер активен (статус 2 = Active)
            if (status == 2) {
                uint256 reward = (amount * percents[level]) / 100;
                // Выплата реферального вознаграждения через transfer с try/catch
                try this._safeTransfer(referrer, reward) {
                } catch Error(string memory reason) {
                    revert(string(abi.encodePacked("Referral transfer failed at level ", _uint2str(level), ": ", reason)));
                } catch {
                    revert(string(abi.encodePacked("Referral transfer failed at level ", _uint2str(level), ": unknown error")));
                }
            }
            current = referrer;
        }
    }

    /// @dev Безопасный transfer с revert reason
    function _safeTransfer(address to, uint256 amount) external {
        require(msg.sender == address(this), "Only callable by contract");
        payable(to).transfer(amount);
    }

    /// @dev Вспомогательная функция для uint в string
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
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

    /// @notice Вывести средства с контракта (только владелец)
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount <= address(this).balance, "Insufficient balance");
        to.transfer(amount);
    }

    /// @notice Установить адрес контракта GoodVibeLive (только владелец)
    function setGoodVibeLiveAddress(address _goodVibeLive) external onlyOwner {
        require(_goodVibeLive != address(0), "Invalid GoodVibeLive address");
        goodVibeLive = _goodVibeLive;
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