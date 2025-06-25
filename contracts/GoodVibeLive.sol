// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GoodVibeLive - DAO GOOD VIBE LIVE
/// @author GOOD VIBE LIVE DEVELOPMENT
/// @notice Контракт для регистрации пользователей, приглашений и верификаций в DAO
/// @custom:evm-version paris
/// @custom:security-contact goodvibe.live/securityalert telegram: @goodvibedevbot

contract GoodVibeLive is ReentrancyGuard, Ownable {
    // ============ Constants ============
    /// @notice Максимальная длина имени пользователя
    uint256 public constant MAX_NAME_LENGTH = 99;
    /// @notice Максимальное количество активных приглашений для одного пользователя
    uint256 public constant MAX_ACTIVE_INVITES = 6;
    /// @notice Время действия приглашения
    uint constant INVITE_VALIDITY = 1 days;
    /// @notice Время действия верификации
    uint constant VERIFICATION_VALIDITY = 3 days;

    // ============ State Variables ============
    /// @notice Адрес основателя DAO (неизменяемый)
    address public immutable founder;
    /// @notice Адрес контракта управления DAO
    address public DAOGovernanceAddress;
    /// @notice Общее количество пользователей
    uint public usersCount;

    // ============ Mappings ============
    /// @notice Маппинг адресов на данные пользователей
    mapping(address => User) public users;

    /// @notice Маппинг активных приглашений
    mapping(address => Invite) public activeInvites;

    /// @notice Маппинг активных верификаций
    mapping(address => Verification) public activeVerifications;

    /// @notice Маппинг истории верификаций пользователей
    mapping(address => Verification[]) public userVerifications;

    /// @notice Маппинг хэшей имён на адреса пользователей
    mapping(bytes32 => address) public userNames;

    /// @notice Маппинг количества активных приглашений для каждого пользователя
    mapping(address => uint256) private activeInvitesCount;

    /// @notice Маппинг балансов пользователей
    mapping(address => uint256) public balances;

    /// @notice Маппинг названий сервисов на адреса сервисов
    mapping(string => Service) public services;

    // ============ Enums ============
    /// @notice Статусы пользователя в системе
    enum UserStatus { 
        None,       // Не зарегистрирован
        Pending,    // Ожидает подтверждения
        Active,     // Активный
        Inactive,   // Неактивный
        Paused,     // Приостановлен
        Blocked     // Заблокирован
    }

    /// @notice Статусы верификации
    enum VerificationStatus { 
        None,       // Нет верификации
        Pending,    // Ожидает проверки
        Approved,   // Одобрена
        Rejected,   // Отклонена
        Disclosed,  // Раскрыта
        Paused,     // Приостановлена
        Verified    // Верифицирована
    }

    // ============ Structs ============
    /// @notice Структура данных пользователя
    struct User {
        string name;              // Имя пользователя
        address userAddress;      // Адрес пользователя
        UserStatus status;        // Статус пользователя
        uint activity;            // Активность (например, количество действий)
        uint level;               // Уровень пользователя
        address referrer;         // Адрес пригласившего
        uint registered;          // Время регистрации (timestamp)
        uint rating;              // Рейтинг пользователя
        uint verificationsCount;  // Количество успешных верификаций
        address[] firstLevelReferrals; // массив рефералов первого уровня
    }

    /// @notice Структура приглашения
    struct Invite {
        address inviter;          // Пригласивший
        address invitee;          // Приглашаемый
        uint expiration;          // Время истечения приглашения
        bool active;              // Активно ли приглашение
    }

    /// @notice Структура верификации
    struct Verification {
        address requester;                // Пользователь, запрашивающий верификацию
        address verifier;                 // Пользователь, который будет верифицировать
        string encryptedFullName;         // Зашифрованное полное имя (макс. 999 символов)
        string photoCID;                  // CID зашифрованного фото в IPFS (макс. 999 символов)
        VerificationStatus status;        // Текущий статус верификации
        string comment;                   // Комментарий к статусу (макс. 333 символа, опционально)
        uint256 created;                  // Дата создания (timestamp)
        bool isInspected;                 // Флаг независимой проверки
        string independentInspection;     // Отчёт независимой проверки (макс. 999 символов)
        bytes32 verificationHash;         // Хэш верификации
    }

    /// @notice Структура сервиса
    struct Service {
        string name; // Название сервиса
        address serviceAddress; // Адрес контракта сервиса
        bool exists; // Флаг существования
    }

    // ============ Events ============
    /// @notice Событие создания приглашения
    event InviteCreated(address indexed inviter, address indexed invitee, uint expiration);
    /// @notice Событие регистрации пользователя
    event UserRegistered(address indexed userAddress, string name, address indexed referrer);
    /// @notice Событие начала верификации
    event VerificationStarted(uint indexed id, address indexed verificator, address indexed verifiable, string ipfsCID);
    /// @notice Событие изменения статуса верификации
    event VerificationStatusChanged(address indexed requester, VerificationStatus status, string comment);
    /// @notice Событие пополнения баланса
    event Deposit(address indexed user, uint256 amount);

    // ============ Modifiers ============
    /// @notice Модификатор для проверки управления DAO
    modifier onlyDAOGovernance() {
        require(msg.sender == DAOGovernanceAddress, "Only DAO Governance");
        _;
    }
    /// @notice Модификатор для проверки активного пользователя
    modifier onlyActiveUser() {
        require(users[msg.sender].status == UserStatus.Active, "User not active");
        _;
    }

    /// @notice Модификатор: только владелец или DAO Governance
    modifier onlyOwnerOrGovernance() {
        require(msg.sender == owner() || msg.sender == DAOGovernanceAddress, "Only owner or DAO Governance");
        _;
    }

    // ============ Конструктор ============
    constructor() Ownable(msg.sender) {
        founder = msg.sender;
        User memory founderUser = User({
            name: "founder",
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 100,
            level: 100,
            referrer: msg.sender,
            registered: block.timestamp,
            rating: 5,
            verificationsCount: 100,
            firstLevelReferrals: new address[](0)
        });
        users[msg.sender] = founderUser;
        bytes32 nameHash = keccak256(abi.encodePacked("founder"));
        userNames[nameHash] = msg.sender;
        usersCount = 1;
    }

    // ============ Функции ============

    /// @notice Создать приглашение для нового пользователя
    /// @param invitee Адрес приглашаемого пользователя
    function createInvite(address invitee) external nonReentrant {
        require(users[msg.sender].status == UserStatus.Active, "Only active users can create invites");
        require(invitee != address(0), "Invalid invitee address");
        require(activeInvitesCount[msg.sender] < MAX_ACTIVE_INVITES, "Maximum active invites reached");
        require(users[msg.sender].firstLevelReferrals.length < 6, "Maximum first-level referrals reached");

        Invite storage existing = activeInvites[invitee];
        require(!existing.active, "Active invite already exists for invitee");

        Invite memory newInvite = Invite({
            inviter: msg.sender,
            invitee: invitee,
            expiration: block.timestamp + INVITE_VALIDITY,
            active: true
        });

        activeInvites[invitee] = newInvite;
        activeInvitesCount[msg.sender]++;
        emit InviteCreated(msg.sender, invitee, newInvite.expiration);
    }

    /// @notice Зарегистрировать пользователя по приглашению
    /// @param name Имя пользователя
    function registerUser(string calldata name) external nonReentrant {
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        require(userNames[nameHash] == address(0), "Name already taken");

        Invite storage invite = activeInvites[msg.sender];
        require(invite.active, "No active invite for caller");
        require(invite.expiration >= block.timestamp, "Invite expired");
        require(users[msg.sender].status != UserStatus.Active, "User already registered");

        users[msg.sender] = User({
            name: name,
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 0,
            level: 0,
            referrer: invite.inviter,
            registered: block.timestamp,
            rating: 5,
            verificationsCount: 0,
            firstLevelReferrals: new address[](0)
        });

        userNames[nameHash] = msg.sender;
        invite.active = false;
        activeInvitesCount[invite.inviter]--;
        usersCount++;
        users[invite.inviter].firstLevelReferrals.push(msg.sender);
        emit UserRegistered(msg.sender, name, invite.inviter);
    }

    /// @notice Получить количество активных приглашений у пользователя
    function getActiveInvitesCount(address user) external view returns (uint256) {
        return activeInvitesCount[user];
    }

    /// @notice Проверяет, зарегистрирован ли пользователь
    function isUserRegistered(address user) public view returns (bool) {
        return users[user].userAddress != address(0);
    }

    /// @notice Создать запрос на верификацию
    function createVerification(
        address _verifier,
        string memory _encryptedFullName,
        string memory _photoCID,
        bytes32 _verificationHash
    ) public nonReentrant {
        require(users[msg.sender].status == UserStatus.Active, "Not registered or blocked");

        Verification storage current = activeVerifications[msg.sender];
        require(
            current.status == VerificationStatus.None ||
            current.status == VerificationStatus.Rejected ||
            current.status == VerificationStatus.Approved ||
            (current.created + VERIFICATION_VALIDITY < block.timestamp),
            "Active verification exists or not expired"
        );

        require(users[_verifier].status == UserStatus.Active, "Verifier not active");
        require(bytes(_encryptedFullName).length <= 999, "Full name too long");
        require(bytes(_photoCID).length <= 999, "Photo CID too long");

        activeVerifications[msg.sender] = Verification({
            requester: msg.sender,
            verifier: _verifier,
            encryptedFullName: _encryptedFullName,
            photoCID: _photoCID,
            status: VerificationStatus.Pending,
            comment: "",
            created: block.timestamp,
            isInspected: false,
            independentInspection: "",
            verificationHash: _verificationHash
        });
    }

    /// @notice Подтвердить или отклонить верификацию
    function approveVerification(
        address _requester,
        bytes32 _verificationHash
    ) public nonReentrant {
        require(
            msg.sender == founder || getApprovedVerificationsCount(msg.sender) >= 3,
            "Not enough approved verifications or not founder"
        );

        Verification storage v = activeVerifications[_requester];
        require(v.verifier == msg.sender, "Not your verification");
        require(v.status == VerificationStatus.Pending, "Verification not pending");

        if (v.verificationHash == _verificationHash) {
            v.status = VerificationStatus.Approved;
            v.comment = "Approved";
            users[_requester].verificationsCount += 1;
        } else {
            v.status = VerificationStatus.Rejected;
            v.comment = "Hash mismatch";
        }

        _finalizeVerification(_requester);
    }

    /// @notice Получить историю верификаций пользователя
    function getUserVerifications(address user) external view returns (Verification[] memory) {
        return userVerifications[user];
    }

    /// @notice Получить историю верификаций как верификатор
    function getVerifierVerifications(address verifier) external view returns (Verification[] memory result) {
        uint count = 0;
        for (uint i = 0; i < userVerifications[verifier].length; i++) {
            if (userVerifications[verifier][i].verifier == verifier) {
                count++;
            }
        }

        result = new Verification[](count);
        uint idx = 0;
        for (uint i = 0; i < userVerifications[verifier].length; i++) {
            if (userVerifications[verifier][i].verifier == verifier) {
                result[idx] = userVerifications[verifier][i];
                idx++;
            }
        }
    }

    /// @notice Подсчитать количество успешных верификаций пользователя
    function getApprovedVerificationsCount(address _user) public view returns (uint) {
        uint count = 0;
        for (uint i = 0; i < userVerifications[_user].length; i++) {
            if (userVerifications[_user][i].status == VerificationStatus.Approved) {
                count++;
            }
        }
        return count;
    }

    /// @dev Переносит верификацию в историю и удаляет из активных
    function _finalizeVerification(address _requester) private {
        Verification storage v = activeVerifications[_requester];
        userVerifications[_requester].push(v);
        userVerifications[v.verifier].push(v);
        delete activeVerifications[_requester];
    }

    /// @notice Пополнить баланс пользователя, отправив средства на контракт
    /// @dev Средства зачисляются на баланс отправителя
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Добавить сервис (только owner или DAO Governance)
    function addService(string calldata name, address serviceAddress) external onlyOwnerOrGovernance {
        require(serviceAddress != address(0), "Invalid service address");
        services[name] = Service({name: name, serviceAddress: serviceAddress, exists: true});
    }

    /// @notice Удалить сервис (только owner или DAO Governance)
    function removeService(string calldata name) external onlyOwnerOrGovernance {
        require(services[name].exists, "Service does not exist");
        delete services[name];
    }

    /// @notice Получить массив рефералов первого уровня
    function getFirstLevelReferrals(address user) external view returns (address[] memory) {
        return users[user].firstLevelReferrals;
    }

    // ============ Управление DAO ============
    function setDAOGovernanceAddress(address _daoGovernance) external onlyOwner {
        require(_daoGovernance != address(0), "Zero address");
        DAOGovernanceAddress = _daoGovernance;
    }

    function setUserStatus(address user, UserStatus status) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].status = status;
    }

    function setUserLevel(address user, uint level) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].level = level;
    }

    function setUserActivity(address user, uint activity) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].activity = activity;
    }

    function setUserRating(address user, uint rating) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].rating = rating;
    }

    function incrementUserRating(address user, uint delta) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].rating += delta;
    }

    function decrementUserRating(address user, uint delta) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        if (users[user].rating > delta) {
            users[user].rating -= delta;
        } else {
            users[user].rating = 0;
        }
    }

    /// @notice Установить количество успешных верификаций пользователя
    /// @dev Только для контракта управления DAO
    /// @param user Адрес пользователя
    /// @param count Новое значение количества успешных верификаций
    function setUserVerificationsCount(address user, uint count) external onlyDAOGovernance nonReentrant {
        // Проверяем, что пользователь существует
        require(users[user].userAddress != address(0), "User not found");
        // Устанавливаем новое значение verificationsCount
        users[user].verificationsCount = count;
    }

    /// @notice Получить статус пользователя по адресу
    /// @param user адрес пользователя
    /// @return статус пользователя (UserStatus)
    function getUserStatus(address user) external view returns (UserStatus) {
        return users[user].status;
    }
}