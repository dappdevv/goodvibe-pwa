// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DAOServices - Контракт для управления сервисами и комиссиями DAO "GOOD VIBE"
/// @author GOOD VIBE DEVELOPMENT
/// @notice Контракт хранит список сервисов, комиссий и принимает оплату комиссионных

contract DAOServices is Ownable {
    /// @notice Структура сервиса
    struct Service {
        string name; // Название сервиса
        address serviceAddress; // Адрес контракта сервиса
        bool exists; // Флаг существования
    }

    /// @notice Структура комиссии
    struct Commission {
        string name; // Название комиссии
        uint256 value; // Значение комиссии (в процентах)
        bool exists; // Флаг существования
    }

    /// @notice События
    event ServiceAdded(uint256 indexed serviceId, string name, address serviceAddress);
    event ServiceRemoved(uint256 indexed serviceId);
    event CommissionAdded(uint256 indexed commissionId, string name, uint256 value);
    event CommissionRemoved(uint256 indexed commissionId);
    event CommissionPaid(address indexed payer, uint256 indexed commissionId, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    /// @notice Маппинг id сервиса к структуре
    mapping(uint256 => Service) public services;
    uint256 public servicesCount;

    /// @notice Маппинг id комиссии к структуре
    mapping(uint256 => Commission) public commissions;
    uint256 public commissionsCount;

    /// @notice Адрес DAO Governance
    address public daoGovernance;

    /// @notice Модификатор: только владелец или DAO Governance
    modifier onlyOwnerOrGovernance() {
        require(msg.sender == owner() || msg.sender == daoGovernance, "Only owner or DAO Governance");
        _;
    }

    /// @notice Конструктор
    /// @param _owner адрес владельца
    constructor(address _owner) Ownable(_owner) {
        require(_owner != address(0), "Invalid owner address");
        // Добавляем комиссию GoodVPNCommission (10%)
        commissions[commissionsCount] = Commission({name: "GoodVPNCommission", value: 10, exists: true});
        emit CommissionAdded(commissionsCount, "GoodVPNCommission", 10);
        commissionsCount++;
    }

    /// @notice Установить адрес DAO Governance (только владелец)
    /// @param _daoGovernance Новый адрес DAO Governance
    function setDAOGovernance(address _daoGovernance) external onlyOwner {
        require(_daoGovernance != address(0), "Invalid DAO Governance address");
        daoGovernance = _daoGovernance;
    }

    /// @notice Добавить сервис (только owner или DAO Governance)
    function addService(string calldata name, address serviceAddress) external onlyOwnerOrGovernance {
        require(serviceAddress != address(0), "Invalid service address");
        services[servicesCount] = Service({name: name, serviceAddress: serviceAddress, exists: true});
        emit ServiceAdded(servicesCount, name, serviceAddress);
        servicesCount++;
    }

    /// @notice Удалить сервис (только owner или DAO Governance)
    function removeService(uint256 serviceId) external onlyOwnerOrGovernance {
        require(services[serviceId].exists, "Service does not exist");
        delete services[serviceId];
        emit ServiceRemoved(serviceId);
    }

    /// @notice Добавить комиссию (только owner или DAO Governance)
    function addCommission(string calldata name, uint256 value) external onlyOwnerOrGovernance {
        require(value > 0, "Commission value must be positive");
        commissions[commissionsCount] = Commission({name: name, value: value, exists: true});
        emit CommissionAdded(commissionsCount, name, value);
        commissionsCount++;
    }

    /// @notice Удалить комиссию (только owner или DAO Governance)
    function removeCommission(uint256 commissionId) external onlyOwnerOrGovernance {
        require(commissions[commissionId].exists, "Commission does not exist");
        delete commissions[commissionId];
        emit CommissionRemoved(commissionId);
    }

    /// @notice Оплатить комиссию (ETH)
    function payCommission(uint256 commissionId) external payable {
        require(commissions[commissionId].exists, "Commission does not exist");
        require(msg.value > 0, "No ETH sent");
        emit CommissionPaid(msg.sender, commissionId, msg.value);
    }

    /// @notice Вывести средства (только owner или DAO Governance)
    function withdraw(address payable to, uint256 amount) external onlyOwnerOrGovernance {
        require(to != address(0), "Invalid recipient address");
        require(amount <= address(this).balance, "Insufficient balance");
        to.transfer(amount);
        emit FundsWithdrawn(to, amount);
    }

    /// @notice Получить баланс контракта
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Приём ETH для работы с GoodVPN
    receive() external payable {}
} 