import { useState, useCallback } from 'react';
import { getUserFriendlyError } from '../utils/ErrorMessages';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error, category = 'system', replacements = {}) => {
    console.error('Error occurred:', error);
    
    const friendlyError = {
      message: getUserFriendlyError(error, category, replacements),
      originalError: error,
      category,
      timestamp: new Date().toISOString(),
      details: {
        code: error?.code || error?.message || 'UNKNOWN',
        stack: error?.stack,
        name: error?.name
      }
    };
    
    setError(friendlyError);
    setIsLoading(false);
    
    return friendlyError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async (asyncFunction, category = 'system', replacements = {}) => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await asyncFunction();
      setIsLoading(false);
      return result;
    } catch (error) {
      return handleError(error, category, replacements);
    }
  }, [handleError, clearError]);

  const retry = useCallback(async (retryFunction, category = 'system', replacements = {}) => {
    return executeWithErrorHandling(retryFunction, category, replacements);
  }, [executeWithErrorHandling]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
    retry,
    hasError: !!error
  };
};

export default useErrorHandler;
