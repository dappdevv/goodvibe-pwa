// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DAOUsers - Управление пользователями и верификациями для GOOD VIBE DAO
/// @author GOOD VIBE
/// @notice Контракт для регистрации пользователей, приглашений и верификаций в DAO
/// @custom:evm-version paris
contract DAOUsers is ReentrancyGuard {
    /// @notice Статус пользователя
    enum UserStatus { None, Pending, Active, Inactive, Paused, Blocked }
    /// @notice Статус верификации
    enum VerificationStatus { None, Pending, Approved, Rejected, Disclosed, Paused, Verified }

    /// @notice Структура пользователя DAO
    struct User {
        string name;              // Имя пользователя
        address userAddress;      // Адрес пользователя
        UserStatus status;        // Статус пользователя
        uint activity;            // Активность (например, количество действий)
        uint level;               // Уровень пользователя
        address referrer;         // Адрес пригласившего
    }

    /// @notice Структура приглашения
    struct Invite {
        uint id;                  // ID приглашения
        address inviter;          // Пригласивший
        address invitee;          // Приглашаемый
        uint expiration;          // Время истечения приглашения
        bool active;              // Активно ли приглашение
    }

    /// @notice Структура данных для хранения информации о верификации пользователя
    struct Verification {
        address requester;                // Пользователь, запрашивающий верификацию
        address verifier;                 // Пользователь, который будет верифицировать
        string encryptedFullName;         // Зашифрованное полное имя (макс. 111 символов)
        string photoCID;                  // CID зашифрованного фото в IPFS (макс. 999 символов)
        VerificationStatus status;        // Текущий статус верификации
        string comment;                   // Комментарий к статусу (макс. 333 символа, опционально)
        uint256 created;                  // Дата создания (timestamp)
        bool isInspected;                 // Флаг независимой проверки
        string independentInspection;     // Отчёт независимой проверки (макс. 999 символов)
        bytes32 verificationHash;         // Хэш верификации
    }

    mapping(address => User) public users;
    mapping(address => Invite) public activeInvites;

    /// @notice Активные верификации пользователей (по адресу инициатора)
    mapping(address => Verification) public activeVerifications;

    /// @notice История (закрытые) верификаций пользователей
    mapping(address => Verification[]) public userVerifications;

    uint private inviteCounter;
    uint private verificationCounter;

    /// @notice Время действия приглашения (24 часа)
    uint constant INVITE_VALIDITY = 1 days;
    /// @notice Время действия верификации (3 дня)
    uint constant VERIFICATION_VALIDITY = 3 days;

    /// @notice Событие создания приглашения
    event InviteCreated(uint indexed id, address indexed inviter, address indexed invitee, uint expiration);
    /// @notice Событие регистрации пользователя
    event UserRegistered(address indexed userAddress, string name, address indexed referrer);
    /// @notice Событие начала верификации
    event VerificationStarted(uint indexed id, address indexed verificator, address indexed verifiable, string ipfsCID);

    address public owner;
    address public DAOGovernanceAddress;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyDAOGovernance() {
        require(msg.sender == DAOGovernanceAddress, "Only DAO Governance");
        _;
    }

    /// @dev В конструкторе создаётся основатель DAO
    constructor() {
        owner = msg.sender;
        User memory founder = User({
            name: "founder",
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 0,
            level: 1,
            referrer: msg.sender
        });
        users[msg.sender] = founder;
    }

    /// @notice Создать приглашение для нового пользователя
    /// @param invitee Адрес приглашаемого пользователя
    function createInvite(address invitee) external nonReentrant {
        require(users[msg.sender].status == UserStatus.Active, "Only active users can create invites");
        require(invitee != address(0), "Invalid invitee address");
        require(activeInvitesCount[msg.sender] < MAX_ACTIVE_INVITES, "Maximum active invites reached");
        
        Invite storage existing = activeInvites[invitee];
        require(!existing.active || existing.expiration < block.timestamp, "Active invite already exists for invitee");

        inviteCounter++;
        Invite memory newInvite = Invite({
            id: inviteCounter,
            inviter: msg.sender,
            invitee: invitee,
            expiration: block.timestamp + INVITE_VALIDITY,
            active: true
        });

        activeInvites[invitee] = newInvite;
        activeInvitesCount[msg.sender]++;

        emit InviteCreated(newInvite.id, msg.sender, invitee, newInvite.expiration);
    }

    /// @notice Зарегистрировать пользователя по приглашению
    /// @param name Имя пользователя
    function registerUser(string calldata name) external nonReentrant {
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(!nameExists[name], "Name already taken");
        
        Invite storage invite = activeInvites[msg.sender];
        require(invite.active, "No active invite for caller");
        require(invite.expiration >= block.timestamp, "Invite expired");
        require(users[msg.sender].status != UserStatus.Active, "User already registered");

        users[msg.sender] = User({
            name: name,
            userAddress: msg.sender,
            status: UserStatus.Active,
            activity: 0,
            level: 1,
            referrer: invite.inviter
        });

        nameExists[name] = true;
        invite.active = false;
        activeInvitesCount[invite.inviter]--;

        emit UserRegistered(msg.sender, name, invite.inviter);
    }

    /// @notice Создать запрос на верификацию
    /// @param _verifier адрес пользователя, который будет верифицировать
    /// @param _encryptedFullName зашифрованное полное имя (макс. 111 символов)
    /// @param _photoCID CID зашифрованного фото (макс. 999 символов)
    /// @param _verificationHash хэш верификации
    function createVerification(
        address _verifier,
        string memory _encryptedFullName,
        string memory _photoCID,
        bytes32 _verificationHash
    ) public nonReentrant {
        // Проверка, что инициатор зарегистрирован и не заблокирован
        require(users[msg.sender].status == UserStatus.Active, "Not registered or blocked");
        Verification storage current = activeVerifications[msg.sender];
        // Проверка, что нет активной верификации или срок действия истёк
        require(
            current.status == VerificationStatus.None ||
            current.status == VerificationStatus.Rejected ||
            current.status == VerificationStatus.Approved ||
            (current.created + VERIFICATION_VALIDITY < block.timestamp),
            "Active verification exists or not expired"
        );
        // Проверка, что верификатор зарегистрирован и не заблокирован
        require(users[_verifier].status == UserStatus.Active, "Verifier not active");

        // Ограничения на длину строк
        require(bytes(_encryptedFullName).length <= 111, "Full name too long");
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
    /// @param _requester адрес пользователя, который запрашивал верификацию
    /// @param _verificationHash хэш верификации
    function approveVerification(
        address _requester,
        bytes32 _verificationHash
    ) public nonReentrant {
        Verification storage v = activeVerifications[_requester];
        require(v.verifier == msg.sender, "Not your verification");
        require(v.status == VerificationStatus.Pending, "Verification not pending");

        if (v.verificationHash == _verificationHash) {
            v.status = VerificationStatus.Approved;
            v.comment = "Approved";
        } else {
            v.status = VerificationStatus.Rejected;
            v.comment = "Hash mismatch";
        }

        _finalizeVerification(_requester);
    }

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

    /// @dev Переносит верификацию в историю и удаляет из активных
    function _finalizeVerification(address _requester) private {
        Verification storage v = activeVerifications[_requester];
        userVerifications[_requester].push(v);
        userVerifications[v.verifier].push(v);
        delete activeVerifications[_requester];
    }

    /// @notice Получить историю верификаций пользователя
    function getUserVerifications(address user) external view returns (Verification[] memory) {
        return userVerifications[user];
    }

    /// @notice Получить историю верификаций как верификатор
    function getVerifierVerifications(address verifier) external view returns (Verification[] memory result) {
        uint count = 0;
        // Считаем количество верификаций, где verifier - верификатор
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

    // Добавляем константы
    uint256 public constant MAX_NAME_LENGTH = 99;
    uint256 public constant MAX_ACTIVE_INVITES = 7;

    // Добавляем маппинг для проверки уникальности имени
    mapping(string => bool) private nameExists;

    // Добавляем счетчик активных приглашений для каждого пользователя
    mapping(address => uint256) private activeInvitesCount;

    // Добавляем функцию для проверки доступности имени
    function isNameAvailable(string calldata name) external view returns (bool) {
        return !nameExists[name];
    }

    // Добавляем функцию для получения количества активных приглашений
    function getActiveInvitesCount(address user) external view returns (uint256) {
        return activeInvitesCount[user];
    }
} 