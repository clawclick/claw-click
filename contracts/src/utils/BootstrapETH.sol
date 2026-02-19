// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BootstrapETH
 * @notice Immutable funding pool for first-time token launchers
 * @dev Provides one free bootstrap per creator (max 50/day globally)
 * 
 * RULES:
 * - Each unique creator gets ONE free launch
 * - Maximum 50 free launches per day (resets at midnight UTC)
 * - Only callable by the registered factory
 * - Completely immutable (no owner, no upgrades)
 * - Manual funding by sending ETH directly to contract
 * 
 * SECURITY:
 * - Factory address immutable (set at deployment)
 * - No external withdrawal function
 * - No owner or admin
 * - ETH only leaves via factory calls
 */
contract BootstrapETH {
    
    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice The only address that can request bootstrap funds
    address public immutable factory;
    
    /// @notice Daily launch limit (50 free launches per day)
    uint256 public constant DAILY_LAUNCH_LIMIT = 50;
    
    /// @notice Seconds in a day (for daily reset calculation)
    uint256 private constant SECONDS_PER_DAY = 86400;
    
    /// @notice Track which addresses have already received free bootstrap
    /// @dev Once true, always true - one free launch per address lifetime
    mapping(address => bool) public hasUsedFreeBootstrap;
    
    /// @notice Current day's launch count
    uint256 public todayLaunchCount;
    
    /// @notice Timestamp of current day (UTC midnight)
    uint256 public currentDayStart;
    
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event BootstrapProvided(address indexed creator, uint256 amount, uint256 dailyCount);
    event DailyLimitReset(uint256 newDayStart);
    event FundsReceived(address indexed sender, uint256 amount);
    
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error OnlyFactory();
    error AlreadyUsedFreeBootstrap();
    error DailyLimitReached();
    error InsufficientFunds();
    
    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Deploy immutable bootstrap funding contract
     * @param _factory Address of ClawclickFactory (only address that can request funds)
     */
    constructor(address _factory) {
        require(_factory != address(0), "Invalid factory");
        factory = _factory;
        
        // Initialize to current day (UTC midnight)
        currentDayStart = _getCurrentDayStart();
    }
    
    /*//////////////////////////////////////////////////////////////
                            FUNDING LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Accept ETH deposits from anyone
     * @dev No withdrawal function - funds can only exit via factory bootstrap requests
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
    
    /*//////////////////////////////////////////////////////////////
                        BOOTSTRAP REQUEST LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Check if a creator is eligible for free bootstrap
     * @param creator Address to check
     * @return eligible True if creator can receive free bootstrap
     */
    function isEligible(address creator) public view returns (bool eligible) {
        // Reset check (view function, doesn't modify state)
        uint256 dayStart = _getCurrentDayStart();
        uint256 currentCount = (dayStart > currentDayStart) ? 0 : todayLaunchCount;
        
        // Check all requirements
        eligible = !hasUsedFreeBootstrap[creator] && currentCount < DAILY_LAUNCH_LIMIT;
    }
    
    /**
     * @notice Request bootstrap ETH for a first-time creator
     * @dev Only callable by factory. Checks eligibility and provides funds.
     * @param creator The address launching their first token
     * @param amount Amount of ETH needed for bootstrap
     * @return success True if bootstrap was provided
     */
    function requestBootstrap(address creator, uint256 amount) 
        external 
        returns (bool success) 
    {
        // Only factory can request
        if (msg.sender != factory) revert OnlyFactory();
        
        // Check if we need to reset daily counter
        _checkAndResetDaily();
        
        // Check eligibility
        if (hasUsedFreeBootstrap[creator]) revert AlreadyUsedFreeBootstrap();
        if (todayLaunchCount >= DAILY_LAUNCH_LIMIT) revert DailyLimitReached();
        if (address(this).balance < amount) revert InsufficientFunds();
        
        // Mark creator as used (prevents future free bootstraps)
        hasUsedFreeBootstrap[creator] = true;
        
        // Increment daily counter
        todayLaunchCount++;
        
        // Transfer bootstrap ETH to factory
        (bool sent, ) = factory.call{value: amount}("");
        require(sent, "ETH transfer failed");
        
        emit BootstrapProvided(creator, amount, todayLaunchCount);
        
        return true;
    }
    
    /*//////////////////////////////////////////////////////////////
                          INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Check if we've crossed into a new day and reset counter
     * @dev Resets todayLaunchCount if we're in a new UTC day
     */
    function _checkAndResetDaily() internal {
        uint256 dayStart = _getCurrentDayStart();
        
        if (dayStart > currentDayStart) {
            // New day - reset counter
            currentDayStart = dayStart;
            todayLaunchCount = 0;
            
            emit DailyLimitReset(dayStart);
        }
    }
    
    /**
     * @notice Calculate UTC midnight timestamp for current day
     * @return dayStart Timestamp of current day at 00:00:00 UTC
     */
    function _getCurrentDayStart() internal view returns (uint256 dayStart) {
        dayStart = (block.timestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
    }
    
    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get current contract balance
     * @return balance Available ETH for bootstrapping
     */
    function getBalance() external view returns (uint256 balance) {
        balance = address(this).balance;
    }
    
    /**
     * @notice Get remaining free launches for today
     * @return remaining Number of free launches still available today
     */
    function getRemainingLaunches() external view returns (uint256 remaining) {
        uint256 dayStart = _getCurrentDayStart();
        uint256 currentCount = (dayStart > currentDayStart) ? 0 : todayLaunchCount;
        
        remaining = currentCount < DAILY_LAUNCH_LIMIT 
            ? DAILY_LAUNCH_LIMIT - currentCount 
            : 0;
    }
    
    /**
     * @notice Get time until daily counter resets
     * @return secondsUntilReset Seconds until midnight UTC
     */
    function getTimeUntilReset() external view returns (uint256 secondsUntilReset) {
        uint256 nextDayStart = _getCurrentDayStart() + SECONDS_PER_DAY;
        secondsUntilReset = nextDayStart - block.timestamp;
    }
    
    /**
     * @notice Check all eligibility details for a creator
     * @param creator Address to check
     * @return eligible If creator can receive free bootstrap
     * @return hasUsed If creator already used their free launch
     * @return remainingToday Remaining free launches today
     * @return contractBalance Available ETH in contract
     */
    function getEligibilityDetails(address creator) 
        external 
        view 
        returns (
            bool eligible,
            bool hasUsed,
            uint256 remainingToday,
            uint256 contractBalance
        ) 
    {
        uint256 dayStart = _getCurrentDayStart();
        uint256 currentCount = (dayStart > currentDayStart) ? 0 : todayLaunchCount;
        
        hasUsed = hasUsedFreeBootstrap[creator];
        remainingToday = currentCount < DAILY_LAUNCH_LIMIT 
            ? DAILY_LAUNCH_LIMIT - currentCount 
            : 0;
        contractBalance = address(this).balance;
        eligible = !hasUsed && remainingToday > 0 && contractBalance > 0;
    }
}
