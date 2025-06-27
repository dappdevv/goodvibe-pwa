// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GoodVibe - DAO "GOOD VIBE"
/// @author GOOD VIBE DEVELOPMENT
/// @notice Контракт для регистрации пользователей, приглашений и верификаций в DAO
/// @custom:evm-version paris
/// @custom:security-contact goodvibe.live/securityalert telegram: @goodvibedevbot

contract GoodVibe is ReentrancyGuard, Ownable {
    // ============ Constants ============
    /// @notice Максимальная длина имени пользователя
    uint256 public constant MAX_NAME_LENGTH = 99;
    /// @notice Максимальное количество активных приглашений для одного пользователя
    uint256 public constant MAX_ACTIVE_INVITES = 6;
    /// @notice Время действия приглашения (в секундах)
    uint constant INVITE_VALIDITY = 1 days;
    /// @notice Время действия верификации (в секундах)
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

    /// @notice Маппинг активных приглашений (адрес пользователя -> приглашение)
    mapping(address => Invite) public activeInvites;

    /// @notice Маппинг активных верификаций (адрес пользователя -> верификация)
    mapping(address => Verification) public activeVerifications;

    /// @notice Маппинг истории верификаций пользователей (адрес пользователя -> массив верификаций)
    mapping(address => Verification[]) public userVerifications;

    /// @notice Маппинг хэшей имён на адреса пользователей
    mapping(bytes32 => address) public userNames;

    /// @notice Маппинг количества активных приглашений для каждого пользователя
    mapping(address => uint256) private activeInvitesCount;

    /// @notice Маппинг адреса пользователя к массиву рефералов первого уровня
    mapping(address => address[]) public firstLevelReferrals;

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

    // ============ Events ============
    /// @notice Событие создания приглашения
    event InviteCreated(address indexed inviter, address indexed invitee, uint expiration);
    /// @notice Событие регистрации пользователя
    event UserRegistered(address indexed userAddress, string name, address indexed referrer);
    /// @notice Событие начала верификации
    event VerificationStarted(uint indexed id, address indexed verificator, address indexed verifiable, string ipfsCID);
    /// @notice Событие изменения статуса верификации
    event VerificationStatusChanged(address indexed requester, VerificationStatus status, string comment);

    // ============ Modifiers ============
    /// @notice Модификатор для проверки управления DAO
    modifier onlyDAOGovernance() {
        require(msg.sender == DAOGovernanceAddress, "Only DAO Governance"); // Только DAO Governance
        _;
    }
    /// @notice Модификатор для проверки активного пользователя
    modifier onlyActiveUser() {
        require(users[msg.sender].status == UserStatus.Active, "User not active"); // Только активный пользователь
        _;
    }

    // ============ Конструктор ============
    /// @notice Конструктор контракта. Регистрирует основателя DAO.
    constructor() Ownable(msg.sender) {
        founder = msg.sender;
        User memory founderUser = User({
            name: "founder",
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 100,
            level: 100,
            referrer: address(0),
            registered: block.timestamp,
            rating: 5,
            verificationsCount: 100
        });
        users[msg.sender] = founderUser;
        // Инициализация массива рефералов основателя
        firstLevelReferrals[msg.sender] = new address[](0);
        bytes32 nameHash = keccak256(abi.encodePacked("founder"));
        userNames[nameHash] = msg.sender;
        usersCount = 1;
    }

    // ============ Функции ============

    /// @notice Создать приглашение для нового пользователя
    /// @param invitee Адрес приглашаемого пользователя
    /// @dev Только активный пользователь может создать приглашение. Лимит — 6 активных приглашений и 6 рефералов.
    function createInvite(address invitee) external nonReentrant {
        require(users[msg.sender].status == UserStatus.Active, "Only active users can create invites"); // Только активный пользователь
        require(invitee != address(0), "Invalid invitee address"); // Проверка адреса
        require(activeInvitesCount[msg.sender] < MAX_ACTIVE_INVITES, "Maximum active invites reached"); // Лимит приглашений
        require(firstLevelReferrals[msg.sender].length < 6, "Maximum first-level referrals reached"); // Лимит рефералов

        Invite storage existing = activeInvites[invitee];
        require(!existing.active, "Active invite already exists for invitee"); // Уже есть активное приглашение

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
    /// @dev Проверяет уникальность имени, наличие приглашения, лимит рефералов у пригласившего
    function registerUser(string calldata name) external nonReentrant {
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long"); // Проверка длины имени
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        require(userNames[nameHash] == address(0), "Name already taken"); // Имя занято

        Invite storage invite = activeInvites[msg.sender];
        require(invite.active, "No active invite for caller"); // Нет приглашения
        require(invite.expiration >= block.timestamp, "Invite expired"); // Приглашение истекло
        require(!isUserRegistered(msg.sender), "User already registered"); // Уже зарегистрирован
        require(firstLevelReferrals[invite.inviter].length < 6, "Referrer has max referrals"); // Лимит рефералов у пригласившего

        users[msg.sender] = User({
            name: name,
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 0,
            level: 0,
            referrer: invite.inviter,
            registered: block.timestamp,
            rating: 5,
            verificationsCount: 0
        });

        userNames[nameHash] = msg.sender;
        invite.active = false;
        activeInvitesCount[invite.inviter]--;
        usersCount++;
        firstLevelReferrals[invite.inviter].push(msg.sender); // Добавляем нового пользователя в рефералы пригласившего
        emit UserRegistered(msg.sender, name, invite.inviter);
    }

    /// @notice Получить количество активных приглашений у пользователя
    /// @param user адрес пользователя
    /// @return количество активных приглашений
    function getActiveInvitesCount(address user) external view returns (uint256) {
        return activeInvitesCount[user];
    }

    /// @notice Проверяет, зарегистрирован ли пользователь
    /// @param user адрес пользователя
    /// @return true если пользователь зарегистрирован
    function isUserRegistered(address user) public view returns (bool) {
        return users[user].userAddress != address(0);
    }

    /// @notice Создать запрос на верификацию
    /// @param _verifier адрес верификатора
    /// @param _encryptedFullName зашифрованное ФИО
    /// @param _photoCID CID фото
    /// @param _verificationHash хэш верификации
    /// @dev Только активный пользователь может создать запрос. Проверяется статус верификатора и ограничения по времени.
    function createVerification(
        address _verifier,
        string memory _encryptedFullName,
        string memory _photoCID,
        bytes32 _verificationHash
    ) public nonReentrant {
        require(users[msg.sender].status == UserStatus.Active, "Not registered or blocked"); // Только активный пользователь

        Verification storage current = activeVerifications[msg.sender];
        require(
            current.status == VerificationStatus.None ||
            current.status == VerificationStatus.Rejected ||
            current.status == VerificationStatus.Approved ||
            (current.created + VERIFICATION_VALIDITY < block.timestamp),
            "Active verification exists or not expired"
        ); // Нет активной или не истекла

        require(users[_verifier].status == UserStatus.Active, "Verifier not active"); // Верификатор должен быть активен
        require(bytes(_encryptedFullName).length <= 999, "Full name too long"); // Ограничение длины ФИО
        require(bytes(_photoCID).length <= 999, "Photo CID too long"); // Ограничение длины CID

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
    /// @param _requester адрес пользователя, проходящего верификацию
    /// @param _verificationHash хэш верификации
    /// @dev Только основатель или пользователь с 3+ успешными верификациями может подтверждать. Проверяется статус и права.
    function approveVerification(
        address _requester,
        bytes32 _verificationHash
    ) public nonReentrant {
        require(
            msg.sender == founder || users[msg.sender].verificationsCount >= 3,
            "Not enough approved verifications or not founder"
        ); // Достаточно успешных верификаций или основатель

        Verification storage v = activeVerifications[_requester];
        require(v.verifier == msg.sender, "Not your verification"); // Только свой запрос
        require(v.status == VerificationStatus.Pending, "Verification not pending"); // Должен быть в ожидании

        if (v.verificationHash == _verificationHash) {
            v.status = VerificationStatus.Approved;
            v.comment = "Approved";
        } else {
            v.status = VerificationStatus.Rejected;
            v.comment = "Hash mismatch";
        }

        _finalizeVerification(_requester);
    }

    /// @notice Получить историю верификаций пользователя
    /// @param user адрес пользователя
    /// @return verifications массив верификаций
    function getUserVerifications(address user) external view returns (Verification[] memory verifications) {
        return userVerifications[user];
    }

    /// @notice Получить историю верификаций как верификатор
    /// @param verifier адрес верификатора
    /// @return result массив верификаций
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

    /// @dev Переносит верификацию в историю и удаляет из активных. Увеличивает счётчик успешных верификаций при одобрении.
    /// @param _requester адрес пользователя, проходящего верификацию
    function _finalizeVerification(address _requester) private {
        Verification storage v = activeVerifications[_requester];
        // Если верификация одобрена, увеличиваем счётчик успешных верификаций
        if (v.status == VerificationStatus.Approved) {
            users[_requester].verificationsCount += 1;
        }
        userVerifications[_requester].push(v);
        userVerifications[v.verifier].push(v);
        delete activeVerifications[_requester];
    }

    /// @notice Получить массив рефералов первого уровня пользователя
    /// @param user адрес пользователя
    /// @return referrals массив адресов рефералов
    function getFirstLevelReferrals(address user) external view returns (address[] memory referrals) {
        return firstLevelReferrals[user];
    }

    // ============ Управление DAO ============
    /// @notice Установить адрес DAO Governance
    /// @param _daoGovernance адрес DAO Governance
    function setDAOGovernanceAddress(address _daoGovernance) external onlyOwner {
        require(_daoGovernance != address(0), "Zero address"); // Нельзя установить нулевой адрес
        DAOGovernanceAddress = _daoGovernance;
    }

    /// @notice Установить статус пользователя
    /// @param user адрес пользователя
    /// @param status новый статус
    function setUserStatus(address user, UserStatus status) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found"); // Пользователь должен существовать
        users[user].status = status;
    }

    /// @notice Установить уровень пользователя
    /// @param user адрес пользователя
    /// @param level новый уровень
    function setUserLevel(address user, uint level) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found"); // Пользователь должен существовать
        users[user].level = level;
    }

    /// @notice Установить активность пользователя
    /// @dev Только для контракта управления DAO
    /// @param user Адрес пользователя
    /// @param activity Новое значение активности
    function setUserActivity(address user, uint activity) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].activity = activity;
    }

    /// @notice Установить рейтинг пользователя
    /// @dev Только для контракта управления DAO
    /// @param user Адрес пользователя
    /// @param rating Новый рейтинг
    function setUserRating(address user, uint rating) external onlyDAOGovernance nonReentrant {
        require(users[user].userAddress != address(0), "User not found");
        users[user].rating = rating;
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

    /// @notice Получить адрес основателя DAO
    function getFounder() external view returns (address) {
        return founder;
    }
}