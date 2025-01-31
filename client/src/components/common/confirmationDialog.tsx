import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from '@mui/material';

interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText: string;
    confirmButtonColor?: 'error' | 'warning' | 'primary' | 'success';
}

const ConfirmationDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText,
    confirmButtonColor = 'primary'
}: ConfirmationDialogProps) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleConfirm}
                    color={confirmButtonColor}
                    variant="contained"
                >
                    {confirmButtonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;