import ReactDOM from "react-dom/client";

export interface TemplateResponse {
    template: string;
    type: 'landing' | 'admin' | 'domain-error';
    allow_login: boolean;
}

export const switchTemplate = async (response: TemplateResponse): Promise<boolean> => {
    if (response.type === 'landing' || response.type === 'domain-error') {
        try {
            // Get existing root if it exists
            const rootElement = document.getElementById('root');
            if (rootElement) {
                // Access existing root instance from element
                const existingRoot = (rootElement as any)._reactRootContainer;
                if (existingRoot) {
                    existingRoot.unmount();
                } else {
                    // Fallback if no existing root
                    const reactRoot = ReactDOM.createRoot(rootElement);
                    reactRoot.unmount();
                }
                rootElement.remove();
            }

            document.documentElement.innerHTML = response.template;
            localStorage.clear();
            sessionStorage.clear();

            return false;
        } catch (error) {
            console.error('Template switch failed:', error);
            throw error;
        }
    }
    return true;
};