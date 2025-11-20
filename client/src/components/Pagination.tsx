import React, { useEffect, useState } from "react";
import { Box, IconButton, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { NavigateBefore, NavigateNext } from "@mui/icons-material";

type Props = {
    page: number;
    setPage: (page: number) => void;
    rows: number;
    limit: number;
    setLimit: (limit: number) => void;
};

export default function CustomPagination({ page, setPage, rows, limit, setLimit }: Props) {
    const [inputPage, setInputPage] = useState(page);

    const totalPages = Math.ceil(rows / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, rows);

    useEffect(() => {
        if (rows < limit) {
            setPage(1);
        } else if (page > totalPages) {
            setPage(totalPages);
        } else if (page < 1) {
            setPage(1);
        }
        setInputPage(page);
    }, [rows, limit, page, setPage, totalPages]);

    const handlePageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        if (value >= 1 && value <= totalPages) {
            setInputPage(value);
        } else {
            setInputPage(page);
        }
    };

    const handleSubmit = () => {
        if (inputPage >= 1 && inputPage <= totalPages) {
            setPage(inputPage);
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderColor: "divider"
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                    {`${startIndex + 1}–${endIndex} of ${rows}`}
                </Typography>

                <Select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); }}
                    size="small"
                    sx={{ minWidth: 80 }}
                >
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                    <MenuItem value={300}>300</MenuItem>
                </Select>

                <Box>
                    <IconButton onClick={() => { setPage(page - 1); }} disabled={page === 1} size="small">
                        <NavigateBefore />
                    </IconButton>

                    <TextField
                        value={inputPage}
                        onChange={handlePageChange}
                        onBlur={handleSubmit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmit();
                        }}
                        size="small"
                        type="number"
                        inputProps={{
                            min: 1,
                            max: totalPages,
                            style: { textAlign: "center", width: "50px" }
                        }}
                        sx={{
                            mx: 1,
                            "& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button":
                                { display: "none" },
                            "& input[type=number]": { MozAppearance: "textfield" }
                        }}
                    />

                    <IconButton
                        onClick={() => { setPage(page + 1); }}
                        disabled={page === totalPages}
                        size="small"
                    >
                        <NavigateNext />
                    </IconButton>
                </Box>
            </Stack>
        </Box>
    );
}