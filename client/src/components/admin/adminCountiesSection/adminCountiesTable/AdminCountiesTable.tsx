import { useState } from 'react';
import {
    Button,
    Snackbar,
    Alert,
    Box
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { County } from '../../../../types/countyTypes';
import countyService from '../../../../services/county.service';

interface Props {
    counties: County[];
    setCounties: React.Dispatch<React.SetStateAction<County[]>>;
}

const AdminCountiesTable = ({ counties, setCounties }: Props) => {
    const [snack, setSnack] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error'
    });

    const closeSnack = () => {
        setSnack(prev => ({ ...prev, open: false }));
    };

    const show = (msg: string, severity: 'success' | 'error') => {
        setSnack({ open: true, message: msg, severity });
    };

    const toggleBlacklist = async (id: string, value: boolean) => {
        try {
            const updated = await countyService.updateBlacklist(id, value);
            setCounties(prev =>
                prev.map(c => (c.id === id ? updated : c))
            );
            show('County updated successfully', 'success');
        } catch (err) {
            show('Failed to update county', 'error');
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'County',
            flex: 1,
            minWidth: 150
        },
        {
            field: 'state',
            headerName: 'State',
            flex: 0.6,
            minWidth: 100
        },
        {
            field: 'population',
            headerName: 'Population',
            flex: 1,
            minWidth: 120,
            renderCell: (params) => params.value ?? '—'
        },
        {
            field: 'timezone',
            headerName: 'Timezone',
            flex: 1,
            minWidth: 120,
            renderCell: (params) => params.value ?? '—'
        },
        {
            field: 'blacklisted',
            headerName: 'Status',
            minWidth: 200,
            flex: 1,
            renderCell: (params) => {
                const isBlacklisted = params.value;
                const id = params.row.id;

                return (
                    <Button
                        variant="contained"
                        color={(isBlacklisted ? 'error' : 'success') as 'error' | 'success'}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleBlacklist(id, !isBlacklisted);
                        }}
                    >
                        {isBlacklisted ? 'BLACKLISTED' : 'ACTIVE'}
                    </Button>
                );
            }
        }
    ];

    return (
        <>
            <DataGrid
                rows={counties}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                onSortModelChange={(params) => {
                    console.log("Sort model changed:", params[0]);
                }}
                onFilterModelChange={(params) => {
                    console.log("Filter model changed:", params);
                }}
                sx={{
                    "& .MuiDataGrid-cell": { py: 2 },
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "action.hover" },
                }}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={closeSnack}
            >
                <Alert onClose={closeSnack} severity={snack.severity} variant="filled">
                    {snack.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AdminCountiesTable;