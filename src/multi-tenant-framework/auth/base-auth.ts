/**
 * Multi-Tenant Testing Framework - Base Authentication Classes
 * 
 * Abstract base classes for authentication that can be extended 
 * for different authentication methods across applications
 */

import type { 
  AuthConfig, 
  AuthValidationConfig, 
  ValidationIndicator,
  SessionConfig 
} from '../types/core.js';

// ============================================================================
// BASE AUTHENTICATION INTERFACE
// ============================================================================

export interface AuthenticationResult {
  success: boolean;
  message: string;
  sessionData?: any;
  error?: string;
  redirectUrl?: string;
}

export interface SessionData {
  cookies?: any[];
  tokens?: Record<string, string>;
  userId?: string;
  username?: string;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// BASE AUTHENTICATION CLASS
// ============================================================================

export abstract class BaseAuthenticator {
  protected config: AuthConfig;
  protected applicationName: string;
  protected sessionData: SessionData | null = null;

  constructor(config: AuthConfig, applicationName: string) {
    this.config = config;
    this.applicationName = applicationName;
  }

  /**
   * Authenticate with the application
   */
  abstract authenticate(): Promise<AuthenticationResult>;

  /**
   * Validate current authentication status
   */
  abstract validateAuthentication(): Promise<boolean>;

  /**
   * Logout from the application
   */
  abstract logout(): Promise<boolean>;

  /**
   * Get current session data
   */
  getSessionData(): SessionData | null {
    return this.sessionData;
  }

  /**
   * Set session data (useful for restoring sessions)
   */
  setSessionData(sessionData: SessionData): void {
    this.sessionData = sessionData;
  }

  /**
   * Clear session data
   */
  clearSessionData(): void {
    this.sessionData = null;
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionData !== null && this.isSessionValid();
  }

  /**
   * Check if session is still valid (not expired)
   */
  protected isSessionValid(): boolean {
    if (!this.sessionData) return false;
    
    if (this.sessionData.expiresAt) {
      return Date.now() < this.sessionData.expiresAt;
    }
    
    return true; // No expiration set, assume valid
  }

  /**
   * Validate authentication using configured indicators
   */
  protected async validateUsingIndicators(
    page: any, 
    indicators: ValidationIndicator[]
  ): Promise<boolean> {
    for (const indicator of indicators) {
      const result = await this.checkIndicator(page, indicator);
      if (result) return true;
    }
    return false;
  }

  /**
   * Check a specific validation indicator
   */
  protected async checkIndicator(page: any, indicator: ValidationIndicator): Promise<boolean> {
    try {
      switch (indicator.type) {
        case 'url-pattern':
          return page.url().includes(indicator.pattern);
          
        case 'element-present':
          return await page.locator(indicator.pattern).count() > 0;
          
        case 'element-absent':
          return await page.locator(indicator.pattern).count() === 0;
          
        case 'text-content':
          const textContent = await page.textContent('body');
          return textContent?.includes(indicator.pattern) || false;
          
        case 'custom':
          // Custom validation logic would be implemented by subclasses
          return await this.customValidation(page, indicator);
          
        default:
          console.warn(`Unknown validation indicator type: ${indicator.type}`);
          return false;
      }
    } catch (error: any) {
      console.warn(`Error checking indicator ${indicator.type}: ${error.message}`);
      return false;
    }
  }

  /**
   * Custom validation logic (to be implemented by subclasses)
   */
  protected async customValidation(page: any, indicator: ValidationIndicator): Promise<boolean> {
    // Default implementation - subclasses can override
    return false;
  }

  /**
   * Save session data to persistent storage
   */
  protected async saveSession(): Promise<void> {
    if (!this.sessionData) return;

    const sessionConfig = this.config.sessionManagement;
    if (!sessionConfig.persistence.enabled) return;

    try {
      const sessionPath = this.getSessionPath();
      const sessionDataWithTimestamp = {
        ...this.sessionData,
        savedAt: Date.now(),
        application: this.applicationName
      };

      await this.writeSessionFile(sessionPath, sessionDataWithTimestamp);
      console.log(`💾 Session saved for ${this.applicationName}`);
    } catch (error: any) {
      console.warn(`Failed to save session: ${error.message}`);
    }
  }

  /**
   * Load session data from persistent storage
   */
  protected async loadSession(): Promise<SessionData | null> {
    const sessionConfig = this.config.sessionManagement;
    if (!sessionConfig.persistence.enabled) return null;

    try {
      const sessionPath = this.getSessionPath();
      const sessionData = await this.readSessionFile(sessionPath);
      
      if (sessionData && this.isStoredSessionValid(sessionData)) {
        console.log(`📂 Session loaded for ${this.applicationName}`);
        return sessionData;
      }
    } catch (error: any) {
      console.warn(`Failed to load session: ${error.message}`);
    }

    return null;
  }

  /**
   * Check if stored session is still valid
   */
  protected isStoredSessionValid(sessionData: any): boolean {
    const sessionConfig = this.config.sessionManagement;
    const now = Date.now();
    
    // Check if session has expired
    if (sessionData.expiresAt && now > sessionData.expiresAt) {
      return false;
    }

    // Check if session was saved too long ago
    if (sessionData.savedAt) {
      const age = now - sessionData.savedAt;
      if (age > sessionConfig.persistence.expiration) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get session file path
   */
  protected getSessionPath(): string {
    const sessionConfig = this.config.sessionManagement;
    const baseDir = sessionConfig.persistence.location;
    const filename = `${this.applicationName}-session.json`;
    return `${baseDir}/${filename}`;
  }

  /**
   * Write session data to file
   */
  protected async writeSessionFile(path: string, data: any): Promise<void> {
    const fs = await import('fs');
    const pathModule = await import('path');
    
    // Ensure directory exists
    const dir = pathModule.dirname(path);
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Write session data
    const sessionData = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(path, sessionData, 'utf8');
  }

  /**
   * Read session data from file
   */
  protected async readSessionFile(path: string): Promise<any> {
    const fs = await import('fs');
    
    if (!await this.fileExists(path)) {
      return null;
    }
    
    const sessionData = await fs.promises.readFile(path, 'utf8');
    return JSON.parse(sessionData);
  }

  /**
   * Check if file exists
   */
  protected async fileExists(path: string): Promise<boolean> {
    const fs = await import('fs');
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SESSION-BASED AUTHENTICATION
// ============================================================================

export class SessionBasedAuthenticator extends BaseAuthenticator {
  private page: any = null;

  constructor(config: AuthConfig, applicationName: string) {
    super(config, applicationName);
  }

  /**
   * Set the Playwright page instance
   */
  setPage(page: any): void {
    this.page = page;
  }

  /**
   * Authenticate using session-based login
   */
  async authenticate(): Promise<AuthenticationResult> {
    if (!this.page) {
      return {
        success: false,
        message: 'Page instance not set. Call setPage() first.',
        error: 'NO_PAGE_INSTANCE'
      };
    }

    try {
      // Try to load existing session first
      const existingSession = await this.loadSession();
      if (existingSession) {
        this.sessionData = existingSession;
        
        // Apply cookies to page
        if (existingSession.cookies) {
          await this.page.context().addCookies(existingSession.cookies);
        }
        
        // Validate existing session
        if (await this.validateAuthentication()) {
          return {
            success: true,
            message: 'Authentication successful using existing session',
            sessionData: this.sessionData
          };
        }
      }

      // Perform fresh login
      return await this.performLogin();
      
    } catch (error: any) {
      return {
        success: false,
        message: `Authentication failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Perform fresh login
   */
  protected async performLogin(): Promise<AuthenticationResult> {
    const loginUrl = this.getLoginUrl();
    
    console.log(`🔑 Performing login for ${this.applicationName} at ${loginUrl}`);
    
    // Navigate to login page
    await this.page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if we're already logged in
    if (await this.validateAuthentication()) {
      await this.captureSession();
      return {
        success: true,
        message: 'Already authenticated',
        sessionData: this.sessionData
      };
    }

    // Get credentials
    const credentials = await this.getCredentials();
    if (!credentials) {
      return {
        success: false,
        message: 'No credentials available',
        error: 'NO_CREDENTIALS'
      };
    }

    // Fill login form
    await this.fillLoginForm(credentials);
    
    // Submit login
    await this.submitLogin();
    
    // Wait for authentication to complete
    await this.waitForAuthenticationResult();
    
    // Validate authentication
    const isAuthenticated = await this.validateAuthentication();
    
    if (isAuthenticated) {
      await this.captureSession();
      await this.saveSession();
      
      return {
        success: true,
        message: 'Authentication successful',
        sessionData: this.sessionData
      };
    } else {
      return {
        success: false,
        message: 'Authentication failed - validation unsuccessful',
        error: 'VALIDATION_FAILED'
      };
    }
  }

  /**
   * Validate current authentication status
   */
  async validateAuthentication(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check using success indicators
      const successResult = await this.validateUsingIndicators(
        this.page, 
        this.config.validation.successIndicators
      );
      
      if (successResult) return true;

      // Check for failure indicators
      const failureResult = await this.validateUsingIndicators(
        this.page, 
        this.config.validation.failureIndicators
      );
      
      return !failureResult; // If no failure indicators, assume success
      
    } catch (error: any) {
      console.warn(`Validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const logoutUrl = this.config.endpoints.logout;
      if (logoutUrl) {
        await this.page.goto(logoutUrl);
      }
      
      this.clearSessionData();
      return true;
      
    } catch (error: any) {
      console.warn(`Logout error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get login URL
   */
  protected getLoginUrl(): string {
    const baseUrl = this.getBaseUrl();
    const loginPath = this.config.endpoints.login || '/login';
    return `${baseUrl}${loginPath}`;
  }

  /**
   * Get base URL (to be implemented based on application config)
   */
  protected getBaseUrl(): string {
    // This would typically come from application configuration
    // For now, return a placeholder
    return 'https://example.com';
  }

  /**
   * Get credentials from configured source
   */
  protected async getCredentials(): Promise<{ username: string; password: string } | null> {
    const credConfig = this.config.credentials;
    if (!credConfig) return null;

    try {
      switch (credConfig.source) {
                 case 'environment':
           return {
             username: process.env[credConfig.references?.username || ''] || '',
             password: process.env[credConfig.references?.password || ''] || ''
           };
          
        case 'file':
          // Implementation for file-based credentials
          return await this.readCredentialsFromFile(credConfig.references);
          
        case 'prompt':
          // Implementation for interactive credential prompt
          return await this.promptForCredentials();
          
        case 'service':
          // Implementation for credential service
          return await this.getCredentialsFromService(credConfig.references);
          
        default:
          return null;
      }
    } catch (error: any) {
      console.warn(`Failed to get credentials: ${error.message}`);
      return null;
    }
  }

  /**
   * Fill login form with credentials
   */
  protected async fillLoginForm(credentials: { username: string; password: string }): Promise<void> {
    // This is a basic implementation - would need to be customized per application
    const usernameField = '#username, #login-form-username, input[name="username"]';
    const passwordField = '#password, #login-form-password, input[name="password"]';
    
    await this.page.fill(usernameField, credentials.username);
    await this.page.fill(passwordField, credentials.password);
  }

  /**
   * Submit login form
   */
  protected async submitLogin(): Promise<void> {
    const submitButton = '#login-form-submit, input[type="submit"], button[type="submit"]';
    await this.page.click(submitButton);
  }

  /**
   * Wait for authentication result
   */
  protected async waitForAuthenticationResult(): Promise<void> {
    const timeout = this.config.validation.timeout || 30000;
    
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error: any) {
      console.warn(`Timeout waiting for authentication result: ${error.message}`);
    }
  }

  /**
   * Capture current session data
   */
  protected async captureSession(): Promise<void> {
    const cookies = await this.page.context().cookies();
    
    this.sessionData = {
      cookies,
      expiresAt: Date.now() + (this.config.sessionManagement.persistence.expiration || 3600000),
             metadata: {
         capturedAt: Date.now(),
         userAgent: 'playwright-session'
       }
    };
  }

  // Credential helper methods (to be implemented based on needs)
  
  protected async readCredentialsFromFile(references: Record<string, string>): Promise<{ username: string; password: string } | null> {
    // Implementation for reading credentials from file
    return null;
  }

  protected async promptForCredentials(): Promise<{ username: string; password: string } | null> {
    // Implementation for interactive credential prompt
    return null;
  }

  protected async getCredentialsFromService(references: Record<string, string>): Promise<{ username: string; password: string } | null> {
    // Implementation for getting credentials from service
    return null;
  }
}

// ============================================================================
// OAUTH2 AUTHENTICATION (PLACEHOLDER)
// ============================================================================

export class OAuth2Authenticator extends BaseAuthenticator {
  async authenticate(): Promise<AuthenticationResult> {
    // OAuth2 implementation would go here
    return {
      success: false,
      message: 'OAuth2 authentication not yet implemented',
      error: 'NOT_IMPLEMENTED'
    };
  }

  async validateAuthentication(): Promise<boolean> {
    return false;
  }

  async logout(): Promise<boolean> {
    return false;
  }
}

// ============================================================================
// AUTHENTICATION FACTORY
// ============================================================================

export class AuthenticatorFactory {
  static create(config: AuthConfig, applicationName: string): BaseAuthenticator {
    switch (config.type) {
      case 'session-based':
        return new SessionBasedAuthenticator(config, applicationName);
        
      case 'oauth2':
        return new OAuth2Authenticator(config, applicationName);
        
      // Add more authentication types as needed
      
      default:
        throw new Error(`Unsupported authentication type: ${config.type}`);
    }
  }
} 