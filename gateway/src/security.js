/**
 * AgentVault Gateway — Security Filter
 * 
 * 危険な操作をブロックするセキュリティレイヤー。
 * 表の価値: エージェントの暴走防止
 * 裏の価値: 攻撃パターンのデータ収集
 */

export class SecurityFilter {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.blockPatterns = config.block_patterns || [];
    this.maxRequestsPerMinute = config.max_requests_per_minute || 120;
    this.blockedCount = 0;
    this.requestTimestamps = [];
  }

  /**
   * ツール呼び出しのセキュリティチェック
   */
  check(toolName, args) {
    if (!this.enabled) return { blocked: false };

    const argsStr = JSON.stringify(args).toUpperCase();
    
    for (const pattern of this.blockPatterns) {
      if (argsStr.includes(pattern.toUpperCase())) {
        this.blockedCount++;
        return {
          blocked: true,
          reason: `Dangerous pattern detected: "${pattern}"`,
          pattern,
          toolName,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * レート制限チェック
   */
  isRateLimited() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 1分以上前のタイムスタンプを除去
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);
    this.requestTimestamps.push(now);
    
    return this.requestTimestamps.length > this.maxRequestsPerMinute;
  }
}

export default SecurityFilter;
