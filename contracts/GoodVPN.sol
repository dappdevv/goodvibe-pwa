// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title GoodVPN - Контракт оплаты VPN сервиса для DAO "GOOD VIBE"
/// @author GOOD VIBE DAO
/// @notice Контракт для оплаты VPN, учёта подписок и распределения комиссий по реферальной программе

interface IDAOServices {
    function commissions(uint256 commissionId) external view returns (string memory, uint256, bool);
    function payCommission(uint256 commissionId) external payable;
}

interface IDAOPartnerProgram {
    function partners(address) external view returns (address referrer, uint8 status, address[] memory);
    function getMaxFirstLevelReferrals(address partner) external view returns (uint256);
    function getReferralsAtLevel(address partner, uint256 level) external view returns (address[] memory);
}

contract GoodVPN {
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
    event DaoServicesChanged(address indexed oldAddress, address indexed newAddress);

    /// @notice Маппинг id сервера к структуре
    mapping(uint256 => ServerVPN) public servers;
    uint256 public serversCount;

    /// @notice Маппинг адреса пользователя к id сервера к подписке
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;

    /// @notice Владелец
    address public owner;
    /// @notice Адрес DAOServices
    address public daoServices;
    /// @notice Адрес DAOPartnerProgram
    address public daoPartnerProgram;
    /// @notice id комиссии GoodVPNCommission (по умолчанию 0)
    uint256 public goodVPNCommissionId = 0;

    /// @notice Модификатор: только владелец
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /// @notice Конструктор
    /// @param _owner адрес владельца
    /// @param _daoServices адрес DAOServices
    /// @param _daoPartnerProgram адрес DAOPartnerProgram
    constructor(address _owner, address _daoServices, address _daoPartnerProgram) {
        require(_owner != address(0), "Invalid owner address");
        require(_daoServices != address(0), "Invalid DAOServices address");
        require(_daoPartnerProgram != address(0), "Invalid DAOPartnerProgram address");
        owner = _owner;
        daoServices = _daoServices;
        daoPartnerProgram = _daoPartnerProgram;
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

    /// @notice Оплатить VPN услугу
    /// @param serverId id сервера
    function payVPN(uint256 serverId) external payable {
        ServerVPN storage server = servers[serverId];
        require(server.exists, "Server does not exist");
        require(server.price > 0, "Server price is zero");
        require(msg.value >= server.price, "Insufficient payment");

        // Получаем комиссию из DAOServices
        (, uint256 commissionPercent, bool commissionExists) = IDAOServices(daoServices).commissions(goodVPNCommissionId);
        require(commissionExists, "Commission does not exist");
        uint256 commissionAmount = (server.price * commissionPercent) / 100;
        require(msg.value >= server.price + commissionAmount, "Insufficient payment for commission");

        // Отправляем комиссию в DAOServices
        (bool sent, ) = payable(daoServices).call{value: commissionAmount}("");
        require(sent, "Commission transfer failed");

        // Обновляем подписку пользователя
        subscriptions[msg.sender][serverId].expiration = block.timestamp + server.expiration;

        // Распределяем оставшуюся сумму по реферальной программе
        uint256 toDistribute = msg.value - commissionAmount;
        _distributeReferralRewards(msg.sender, toDistribute);

        emit VPNPaid(msg.sender, serverId, subscriptions[msg.sender][serverId].expiration, msg.value, commissionAmount);
    }

    /// @dev Внутренняя функция распределения комиссионных по реферальной программе
    function _distributeReferralRewards(address user, uint256 amount) internal {
        // Комиссионные по уровням: [30, 10, 10, 10, 10, 5, 5, 20]
        uint256[8] memory percents = [uint256(30),10,10,10,10,5,5,20];
        address current = user;
        for (uint256 level = 0; level < 8; level++) {
            (address referrer, uint8 status, ) = IDAOPartnerProgram(daoPartnerProgram).partners(current);
            if (referrer == address(0)) break;
            // Проверяем статус и активную подписку
            if (status == 1 && _hasActiveSubscription(referrer)) {
                uint256 reward = (amount * percents[level]) / 100;
                (bool sent, ) = payable(referrer).call{value: reward}("");
                require(sent, "Referral reward transfer failed");
            }
            current = referrer;
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

    /// @notice Установить новый адрес DAOServices (только владелец)
    function setDaoServices(address newDaoServices) external onlyOwner {
        require(newDaoServices != address(0), "Invalid DAOServices address");
        address old = daoServices;
        daoServices = newDaoServices;
        emit DaoServicesChanged(old, newDaoServices);
    }
} 