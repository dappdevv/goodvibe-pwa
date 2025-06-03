// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title GoodVibeNFT
 * @dev ERC721 NFT контракт с поддержкой координат, кастомных метаданных, голосования и управления.
 * Контракт позволяет минтить уникальные NFT, привязанные к географическим координатам (широта/долгота),
 * а также хранить для каждого токена дополнительные пользовательские метаданные.
 * Минтинг доступен только доверенному контракту-минтеру, управление — только владельцу.
 * Используются стандартные реализации OpenZeppelin для безопасности и расширяемости.
 */

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Votes} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Основной контракт NFT коллекции GoodVibe
 */
contract GoodVibeNFT is ERC721, ERC721Enumerable, Ownable, EIP712, ERC721Votes {
    /// @dev адрес контракта-минтера, которому разрешён минтинг NFT
    address public NFTMinterContract;
    /// @dev базовый URI для метаданных токенов
    string private _baseTokenURI;
    /// @dev масштаб для хранения координат с точностью до 0.001
    uint256 public constant SCALE = 1000;
    /// @dev масштаб в формате int32 для внутренних расчётов
    int32 public constant SCALE_INT32 = 1000;
    /// @dev минимальная широта
    int32 public constant MIN_LAT = -80;
    /// @dev максимальная широта
    int32 public constant MAX_LAT = 84;
    /// @dev минимальная долгота
    int32 public constant MIN_LNG = -180;
    /// @dev максимальная долгота
    int32 public constant MAX_LNG = 180;

    /**
     * @dev Структура для хранения данных токена
     * @param id — уникальный идентификатор токена
     * @param lng — долгота (умноженная на SCALE)
     * @param lat — широта (умноженная на SCALE)
     * @param customMetadata — дополнительные пользовательские метаданные
     */
    struct TokenData {
        uint256 id;
        int32 lng;
        int32 lat;
        string customMetadata;
    }

    /// @dev отображение координат на tokenId (для проверки уникальности)
    mapping(int32 => mapping(int32 => uint256)) public tokens;
    /// @dev отображение tokenId на структуру TokenData
    mapping(uint256 => TokenData) public tokenData;

    /// @dev событие обновления метаданных токена
    event MetadataUpdated(uint256 tokenId);
    /// @dev событие пакетного минта
    event BatchMinted(address to, uint256 count);
    /// @dev событие минта токена
    event Minted(uint256 tokenId, int32 lng, int32 lat);

    /**
     * @dev Конструктор контракта
     * @param initialOwner — адрес владельца контракта
     */
    constructor(address initialOwner)
        ERC721("GoodVibeNFT", "Good Vibe")
        Ownable(initialOwner)
        EIP712("GoodVibeNFT", "1")
    {
        _baseTokenURI = "https://goodvibe.live/nft/";
    }

    /**
     * @dev Модификатор: разрешено только контракту-минтеру
     */
    modifier onlyNFTMinterContract() {
        require(msg.sender == NFTMinterContract, "Not minter");
        _;
    }

    /**
     * @dev Установить адрес контракта-минтера (только владелец)
     * @param minter — адрес минтера
     */
    function setNFTMinterContract(address minter) external onlyOwner {
        require(minter != address(0), "Zero address");
        NFTMinterContract = minter;
    }

    /**
     * @dev Получить базовый URI для токенов (внутренняя функция)
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Установить новый базовый URI (только владелец)
     * @param newBaseURI — новый базовый URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    /**
     * @dev Пакетный минт токенов по массиву координат (только минтер)
     * @param to — адрес получателя
     * @param lngs — массив долгот
     * @param lats — массив широт
     */
    function batchMint(address to, int32[] memory lngs, int32[] memory lats) 
        external 
        onlyNFTMinterContract
    {
        require(lngs.length == lats.length, "Array length mismatch");
        
        for(uint256 i = 0; i < lngs.length; i++) {
            _mintSingle(to, lngs[i], lats[i]);
        }
        
        emit BatchMinted(to, lngs.length);
    }

    /**
     * @dev Минт одного токена по координатам (только минтер)
     * @param to — адрес получателя
     * @param lng — долгота
     * @param lat — широта
     */
    function mint(address to, int32 lng, int32 lat)
        external
        onlyNFTMinterContract
    {
        _mintSingle(to, lng, lat);
    }

    /**
     * @dev Внутренняя функция минта одного токена
     * Проверяет уникальность координат, генерирует tokenId, сохраняет данные
     */
    function _mintSingle(address to, int32 lng, int32 lat) private {
        require(tokens[lng][lat] == 0, "Token exists");
        
        uint256 tokenId = getTokenId(lng, lat);
        _safeMint(to, tokenId);

        tokens[lng][lat] = tokenId;
        tokenData[tokenId] = TokenData({
            id: tokenId,
            lng: lng,
            lat: lat,
            customMetadata: ""
        });
        
        emit Minted(tokenId, lng, lat);
    }

    /**
     * @dev Установить кастомные метаданные для токена (только владелец токена)
     * @param tokenId — идентификатор токена
     * @param metadata — новые метаданные
     */
    function setTokenMetadata(uint256 tokenId, string memory metadata) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        tokenData[tokenId].customMetadata = metadata;
        emit MetadataUpdated(tokenId);
    }

    /**
     * @dev Получить уникальный tokenId по координатам
     * @param lng — долгота
     * @param lat — широта
     * @return tokenId — уникальный идентификатор токена
     */
    function getTokenId(int32 lng, int32 lat) public pure returns (uint256) {
        require(lat >= MIN_LAT * SCALE_INT32 && lat <= MAX_LAT * SCALE_INT32, "Invalid lat");
        require(lng >= MIN_LNG * SCALE_INT32 && lng <= MAX_LNG * SCALE_INT32, "Invalid lng");
        
        return uint256(keccak256(abi.encodePacked(
            uint32(uint256(int256(lng + MAX_LNG * SCALE_INT32))), 
            uint32(uint256(int256(lat + MAX_LAT * SCALE_INT32)))
        )));
    }

    /**
     * @dev Проверить существование токена по tokenId
     * @param tokenId — идентификатор токена
     * @return true если токен существует, иначе false
     */
    function exists(uint256 tokenId) public view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    // ================== Переопределения ==================

    /**
     * @dev Внутренняя функция обновления токена (для поддержки расширений)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable, ERC721Votes)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Внутренняя функция увеличения баланса (для поддержки расширений)
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable, ERC721Votes)
    {
        super._increaseBalance(account, value);
    }

    /**
     * @dev Проверка поддержки интерфейсов (ERC165)
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ================== Вспомогательные функции ==================

    /**
     * @dev Проверка валидности координат
     * @param lat — широта
     * @param lng — долгота
     */
    function _validateCoordinates(int32 lat, int32 lng) internal pure {
        require(lat >= MIN_LAT * SCALE_INT32 && lat <= MAX_LAT * SCALE_INT32, "Invalid lat");
        require(lng >= MIN_LNG * SCALE_INT32 && lng <= MAX_LNG * SCALE_INT32, "Invalid lng");
    }

    /**
     * @dev Кодирование координат для генерации tokenId
     * @param lat — широта
     * @param lng — долгота
     * @return (кодированная долгота, кодированная широта)
     */
    function _encodeCoordinates(int32 lat, int32 lng) internal pure returns (uint32, uint32) {
        return (
            uint32(uint256(int256(lng + MAX_LNG * SCALE_INT32))), 
            uint32(uint256(int256(lat + MAX_LAT * SCALE_INT32)))
        );
    }
}