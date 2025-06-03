// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title DAOPartnerProgram - Партнёрская программа для DAO "GOOD VIBE"
/// @author GOOD VIBE DAO
/// @notice Контракт реализует 8-уровневую реферальную систему с бизнес-логикой комиссионных и статусами партнёров

contract DAOPartnerProgram {
    /// @notice Статусы партнёра
    enum PartnerStatus { None, Active, Inactive, Blocked, Paused }

    /// @notice Структура данных о партнёре
    struct Partner {
        address referrer; // адрес пригласившего
        PartnerStatus status; // статус партнёра
        address[] firstLevelReferrals; // массив рефералов первого уровня
    }

    /// @notice События
    event PartnerRegistered(address indexed partner, address indexed referrer);
    event PartnerStatusChanged(address indexed partner, PartnerStatus status);
    event PartnerRemoved(address indexed partner, address indexed replacedBy);

    /// @notice Маппинг адреса к структуре партнёра
    mapping(address => Partner) public partners;

    /// @notice Адрес основателя (founder)
    address public founder;
    /// @notice Адрес контракта DAO Governance
    address public daoGovernance;

    /// @notice Модификатор: только DAO Governance
    modifier onlyDAOGovernance() {
        require(msg.sender == daoGovernance, "Only DAO Governance");
        _;
    }

    /// @notice Модификатор: только основатель
    modifier onlyFounder() {
        require(msg.sender == founder, "Only founder");
        _;
    }

    /// @notice Конструктор
    /// @param _founder адрес основателя
    /// @param _daoGovernance адрес DAO Governance
    constructor(address _founder, address _daoGovernance) {
        require(_founder != address(0), "Invalid founder address");
        require(_daoGovernance != address(0), "Invalid DAO Governance address");
        founder = _founder;
        daoGovernance = _daoGovernance;
        // Регистрируем основателя как первого партнёра
        partners[_founder].status = PartnerStatus.Active;
    }

    /// @notice Регистрация нового партнёра
    /// @param referrer адрес пригласившего (берётся из DAOUsers)
    function register(address referrer) external {
        require(partners[msg.sender].status == PartnerStatus.None, "Already registered");
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(partners[referrer].status == PartnerStatus.Active, "Referrer is not active");

        // Проверяем лимит на количество рефералов первого уровня
        if (referrer != founder) {
            uint256 maxFirstLevel = getMaxFirstLevelReferrals(referrer);
            require(partners[referrer].firstLevelReferrals.length < maxFirstLevel, "First level referrals limit exceeded");
        }
        
        partners[msg.sender].referrer = referrer;
        partners[msg.sender].status = PartnerStatus.Active;
        partners[referrer].firstLevelReferrals.push(msg.sender);

        emit PartnerRegistered(msg.sender, referrer);
    }

    /// @notice Получить массив рефералов первого уровня
    function getFirstLevelReferrals(address partner) external view returns (address[] memory) {
        return partners[partner].firstLevelReferrals;
    }

    /// @notice Получить массив рефералов на определённом уровне
    /// @param partner адрес партнёра
    /// @param level уровень (1-8)
    function getReferralsAtLevel(address partner, uint256 level) external view returns (address[] memory) {
        require(level >= 1 && level <= 8, "Level out of range");
        return _getReferralsAtLevel(partner, level);
    }

    /// @notice Получить количество рефералов на определённом уровне
    function getReferralsCountAtLevel(address partner, uint256 level) external view returns (uint256) {
        return _getReferralsAtLevel(partner, level).length;
    }

    /// @notice Установить статус партнёра (только DAO Governance)
    function setPartnerStatus(address partner, PartnerStatus status) external onlyDAOGovernance {
        require(partners[partner].status != PartnerStatus.None, "Partner not found");
        partners[partner].status = status;
        emit PartnerStatusChanged(partner, status);
    }

    /// @notice Удалить партнёра (только DAO Governance)
    /// Если у партнёра есть рефералы, первый активный становится на его место
    function removePartner(address partner) external onlyDAOGovernance {
        require(partners[partner].status != PartnerStatus.None, "Partner not found");
        address referrer = partners[partner].referrer;
        address[] storage referrals = partners[partner].firstLevelReferrals;
        address replacement = address(0);
        // Ищем первого активного реферала
        for (uint256 i = 0; i < referrals.length; i++) {
            if (partners[referrals[i]].status == PartnerStatus.Active) {
                replacement = referrals[i];
                break;
            }
        }
        if (replacement != address(0)) {
            // Переназначаем referrer для replacement
            partners[replacement].referrer = referrer;
            // Переносим всех остальных рефералов к replacement
            for (uint256 i = 0; i < referrals.length; i++) {
                if (referrals[i] != replacement) {
                    partners[referrals[i]].referrer = replacement;
                    partners[replacement].firstLevelReferrals.push(referrals[i]);
                }
            }
            // Добавляем replacement в массив рефералов referrer
            if (referrer != address(0)) {
                address[] storage referrerReferrals = partners[referrer].firstLevelReferrals;
                for (uint256 i = 0; i < referrerReferrals.length; i++) {
                    if (referrerReferrals[i] == partner) {
                        referrerReferrals[i] = replacement;
                        break;
                    }
                }
            }
        } else {
            // Если нет активных рефералов, просто удаляем из массива referrer
            if (referrer != address(0)) {
                address[] storage referrerReferrals = partners[referrer].firstLevelReferrals;
                for (uint256 i = 0; i < referrerReferrals.length; i++) {
                    if (referrerReferrals[i] == partner) {
                        referrerReferrals[i] = referrerReferrals[referrerReferrals.length - 1];
                        referrerReferrals.pop();
                        break;
                    }
                }
            }
        }
        delete partners[partner];
        emit PartnerRemoved(partner, replacement);
    }

    /// @notice Получить максимальное количество рефералов первого уровня для партнёра
    function getMaxFirstLevelReferrals(address partner) public view returns (uint256) {
        if (partner == founder) {
            return type(uint256).max; // unlimited
        }
        uint256 level8Count = _getReferralsAtLevel(partner, 8).length;
        if (level8Count < 1000) return 3;
        if (level8Count < 3000) return 4;
        if (level8Count < 6000) return 5;
        return 6;
    }

    /// @notice Получить количество рефералов на определённом уровне
    function _getReferralsAtLevel(address partner, uint256 level) internal view returns (address[] memory) {
        require(level >= 1 && level <= 8, "Level out of range");
        if (level == 1) {
            return partners[partner].firstLevelReferrals;
        }
        // BFS обход для поиска рефералов на нужном уровне
        address[] memory currentLevel = partners[partner].firstLevelReferrals;
        for (uint256 l = 2; l <= level; l++) {
            address[] memory nextLevel = new address[](0);
            uint256 count = 0;
            for (uint256 i = 0; i < currentLevel.length; i++) {
                address[] memory children = partners[currentLevel[i]].firstLevelReferrals;
                // увеличиваем размер массива nextLevel
                address[] memory temp = new address[](count + children.length);
                for (uint256 j = 0; j < count; j++) temp[j] = nextLevel[j];
                for (uint256 j = 0; j < children.length; j++) temp[count + j] = children[j];
                count += children.length;
                nextLevel = temp;
            }
            currentLevel = nextLevel;
        }
        return currentLevel;
    }
} 