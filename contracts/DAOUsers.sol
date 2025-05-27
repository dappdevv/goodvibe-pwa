// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title DAOUsers - Управление пользователями и верификациями для GOOD VIBE DAO
/// @author GOOD VIBE
/// @notice Контракт для регистрации пользователей, приглашений и верификаций в DAO
/// @custom:evm-version paris
contract DAOUsers {
    /// @notice Статус пользователя
    enum UserStatus { None, Pending, Active, Inactive }
    /// @notice Статус верификации
    enum VerificationStatus { None, Pending, Approved, Rejected }

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

    /// @notice Структура верификации
    struct Verification {
        uint id;                      // ID верификации
        address verificator;          // Кто верифицирует
        address verifiable;           // Кого верифицируют
        VerificationStatus status;    // Статус верификации
        string verificationString;    // Описание/строка верификации
        bytes32 verificationHash;     // Хэш верификации
        bytes32 photoHash;            // Хэш фото
        string ipfsCID;               // CID в IPFS
        string description;           // Описание
    }

    mapping(address => User) public users;
    mapping(uint => Verification) public verifications;
    mapping(address => Verification[]) public userVerifications;
    mapping(address => Invite) private activeInvites;

    uint private inviteCounter;
    uint private verificationCounter;

    /// @notice Время действия приглашения (3 дня)
    uint constant INVITE_VALIDITY = 3 days;

    /// @notice Событие создания приглашения
    event InviteCreated(uint indexed id, address indexed inviter, address indexed invitee, uint expiration);
    /// @notice Событие регистрации пользователя
    event UserRegistered(address indexed userAddress, string name, address indexed referrer);
    /// @notice Событие начала верификации
    event VerificationStarted(uint indexed id, address indexed verificator, address indexed verifiable, string ipfsCID);

    /// @dev В конструкторе создаётся основатель DAO
    constructor() {
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
    function createInvite(address invitee) external {
        require(users[msg.sender].status == UserStatus.Active, "Only active users can create invites");
        require(invitee != address(0), "Invalid invitee address");
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

        emit InviteCreated(newInvite.id, msg.sender, invitee, newInvite.expiration);
    }

    /// @notice Зарегистрировать пользователя по приглашению
    /// @param name Имя пользователя
    function registerUser(string calldata name) external {
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

        invite.active = false;

        emit UserRegistered(msg.sender, name, invite.inviter);
    }

    /// @notice Начать верификацию пользователя
    /// @param verifiable Кого верифицируют
    /// @param ipfsCID CID фото/документа в IPFS
    /// @param verificationString Строка/описание верификации
    /// @param encryptedPhotoBuffer Зашифрованный буфер фото (используется только для хэша)
    /// @param description Описание верификации
    function startVerification(
        address verifiable,
        string calldata ipfsCID,
        string calldata verificationString,
        bytes calldata encryptedPhotoBuffer,
        string calldata description
    ) external {
        require(users[msg.sender].status == UserStatus.Active, "Verificator must be active user");
        require(users[verifiable].status == UserStatus.Active, "Verifiable must be active user");

        bytes32 verificationHash = keccak256(abi.encodePacked(block.timestamp, verificationString));
        bytes32 photoHash = keccak256(encryptedPhotoBuffer);

        verificationCounter++;

        Verification memory v = Verification({
            id: verificationCounter,
            verificator: msg.sender,
            verifiable: verifiable,
            status: VerificationStatus.Pending,
            verificationString: verificationString,
            verificationHash: verificationHash,
            photoHash: photoHash,
            ipfsCID: ipfsCID,
            description: description
        });

        verifications[verificationCounter] = v;
        userVerifications[verifiable].push(v);

        emit VerificationStarted(verificationCounter, msg.sender, verifiable, ipfsCID);
    }
} 