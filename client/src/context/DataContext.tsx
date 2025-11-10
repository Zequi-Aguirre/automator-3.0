import React, { createContext, ReactNode, useEffect, useState } from "react";
import { User } from "../types/userTypes.ts";
import { Session } from "../types/userTypes";

type LoginRecord = {
    email: string;
    password: string;
}

type DataContextType = {
    session: Session | null;
    setSession: React.Dispatch<React.SetStateAction<Session | null>>;
    loggedInUser: User | null;
    setLoggedInUser: React.Dispatch<React.SetStateAction<User | null>>;
    role: string;
    setRole: React.Dispatch<React.SetStateAction<string>>;
    loginRecord: LoginRecord;
    setLoginRecord: React.Dispatch<React.SetStateAction<LoginRecord>>;
    allowLogin: boolean;
    setAllowLogin: React.Dispatch<React.SetStateAction<boolean>>;
}

const CURRENT_VERSION = 2; // Update this value whenever the data structure changes
const defaultData = {
    session: null,
    loggedInUser: null,
    version: CURRENT_VERSION,
}

// Get data from local storage
const loadFromLocalStorage = () => {
    try {
        // Retrieve data from local storage
        const storedData = localStorage.getItem("appData");
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            // Check if the data version matches the current version
            if (parsedData.version === CURRENT_VERSION) {
                return parsedData;
            }
            // If the data version does not match the current version, return default values
            return defaultData;
        }
    } catch (error) {
        console.error("Error loading data from local storage:", error);
    }
    // Return default values if no data found in local storage
    return defaultData
};

const DataContext = createContext<DataContextType>({
    session: null,
    setSession: () => {},
    loggedInUser: null,
    setLoggedInUser: () => {},
    role: '',
    setRole: () => {},
    loginRecord: { email: '', password: '' },
    setLoginRecord: () => {},
    allowLogin: false,
    setAllowLogin: () => {},
})

type Props = {
    children: ReactNode;
};

export const AppProps = ({ children }: Props) => {
    const initialState = loadFromLocalStorage();
    const [session, setSession] = useState<Session | null>(initialState.session);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(initialState.loggedInUser);
    const [role, setRole] = useState<string>(initialState.role);
    const [loginRecord, setLoginRecord] = useState<LoginRecord>({ email: '', password: '' });
    const [allowLogin, setAllowLogin] = useState<boolean>(initialState.allowLogin);

    // Use useEffect to save state to local storage whenever it changes
    useEffect(() => {
        const dataToStore = {
            session,
            loggedInUser,
            role,
            allowLogin,
            version: CURRENT_VERSION,
        };
        try {
            // Store data in local storage as a JSON string
            localStorage.setItem("appData", JSON.stringify(dataToStore));
        } catch (error) {
            console.error("Error saving data to local storage:", error);
        }
    }, [session, loggedInUser, role, allowLogin]);

    return (
        <DataContext.Provider
            value={{
                session,
                setSession,
                loggedInUser,
                setLoggedInUser,
                role,
                setRole,
                loginRecord,
                setLoginRecord,
                allowLogin,
                setAllowLogin,
            }}
        >
        {children}
        </DataContext.Provider>
    );
};

export default DataContext;

// To Create a Context
// 1. Create a context.jsx file, add all necessary boilerplate code and the states
// 2. Wrap your App with the contextProvider in App.js
// 3. Use useContext(contextName) method to get your state values in any component you want.
