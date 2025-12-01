import React, { createContext, ReactNode, useEffect, useState, useMemo } from "react";
import { User, Session } from "../types/userTypes.ts";

type LoginRecord = {
    email: string;
    password: string;
};

type LeadFilters = {
    page: number;
    limit: number;
    search: string;
    status: "new" | "verified" | "sent" | "trash";
};

type CountyFilters = {
    page: number;
    limit: number;
    search: string;
    status: "all" | "active" | "blacklisted";
};

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
    leadFilters: LeadFilters;
    setLeadFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
    countyFilters: CountyFilters;
    setCountyFilters: React.Dispatch<React.SetStateAction<CountyFilters>>;
};

const CURRENT_VERSION = 4;

const defaultLeadFilters: LeadFilters = {
    page: 1,
    limit: 200,
    search: "",
    status: "new"
};

const defaultCountyFilters: CountyFilters = {
    page: 1,
    limit: 100,
    search: "",
    status: "all"
};

const defaultData = {
    session: null,
    loggedInUser: null,
    role: "",
    allowLogin: false,
    leadFilters: defaultLeadFilters,
    countyFilters: defaultCountyFilters,
    version: CURRENT_VERSION
};

const loadFromLocalStorage = () => {
    try {
        const stored = localStorage.getItem("appData");
        if (!stored) return defaultData;

        const parsed = JSON.parse(stored);
        if (parsed.version === CURRENT_VERSION) return parsed;

        return defaultData;
    } catch {
        return defaultData;
    }
};

const DataContext = createContext<DataContextType>({
    session: null,
    setSession: () => {},
    loggedInUser: null,
    setLoggedInUser: () => {},
    role: "",
    setRole: () => {},
    loginRecord: { email: "", password: "" },
    setLoginRecord: () => {},
    allowLogin: false,
    setAllowLogin: () => {},
    leadFilters: defaultLeadFilters,
    setLeadFilters: () => {},
    countyFilters: defaultCountyFilters,
    setCountyFilters: () => {}
});

export const AppProps = ({ children }: { children: ReactNode }) => {
    const initial = loadFromLocalStorage();

    const [session, setSession] = useState<Session | null>(initial.session);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(initial.loggedInUser);
    const [role, setRole] = useState<string>(initial.role);
    const [loginRecord, setLoginRecord] = useState({ email: "", password: "" });
    const [allowLogin, setAllowLogin] = useState<boolean>(initial.allowLogin);

    const [leadFilters, setLeadFilters] = useState(initial.leadFilters);
    const [countyFilters, setCountyFilters] = useState(initial.countyFilters);

    useEffect(() => {
        const data = {
            session,
            loggedInUser,
            role,
            allowLogin,
            leadFilters,
            countyFilters,
            version: CURRENT_VERSION
        };
        localStorage.setItem("appData", JSON.stringify(data));
    }, [session, loggedInUser, role, allowLogin, leadFilters, countyFilters]);

    const contextValue = useMemo(
        () => ({
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
            leadFilters,
            setLeadFilters,
            countyFilters,
            setCountyFilters
        }),
        [
            session,
            loggedInUser,
            role,
            loginRecord,
            allowLogin,
            leadFilters,
            countyFilters
        ]
    );

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};

export default DataContext;

// To Create a Context
// 1. Create a context.jsx file, add all necessary boilerplate code and the states
// 2. Wrap your App with the contextProvider in App.js
// 3. Use useContext(contextName) method to get your state values in any component you want.
