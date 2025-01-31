import React, {useState} from 'react';
import {
    TextField,
    Button,
    Typography,
    Paper,
    Grid,
    Alert,
} from '@mui/material';
import leadsService from "../../../services/lead.service.tsx";

const LeadForm = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        address: '',
        city: '',
        state: '',
        zipcode: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        companyName: '',
        pingId: '',
    });

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStep1Submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await leadsService.pingLead(formData);
            setFormData(prev => ({
                ...prev,
                pingId: response.ping_id,
                companyName: response.company_name,
            }));
            setStep(2);
        } catch (error) {
            setError('Failed to process information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!formData.pingId) {
                throw new Error('Ping ID is missing. Please complete Step 1 first.');
            }

            const contactData = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                email: formData.email
            };

            const response = await leadsService.postLead(formData.pingId, contactData);

            console.log('Lead submitted successfully:', response);

            // Set success state to true to show the success page
            setSuccess(true);
        } catch (error) {
            console.error('Failed to submit lead:', error);
            setError('Failed to submit information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
            <Paper elevation={3} className="p-6 max-w-md mx-auto"
                   style={{padding: '20px', width: '100%', maxWidth: '500px'}}>
                {error && <Alert severity="error" className="mb-4">{error}</Alert>}

                {success
                    ? (
                        <Grid container spacing={3} justifyContent="center">
                            <Grid item xs={12}>
                                <Typography variant="h4" align="center">
                                    🎉 Success!
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body1" align="center">
                                    The lead has been successfully submitted.
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={() => {
                                        setStep(1);
                                        setSuccess(false);
                                        setFormData({
                                            address: '',
                                            city: '',
                                            state: '',
                                            zipcode: '',
                                            firstName: '',
                                            lastName: '',
                                            phone: '',
                                            email: '',
                                            companyName: '',
                                            pingId: ''
                                        });
                                    }}
                                >
                                    Submit Another Lead
                                </Button>
                            </Grid>
                        </Grid>
                    )
                    : step === 1
                        ? (<form onSubmit={handleStep1Submit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Typography variant="h6" className="mb-4">
                                            Property Information
                                        </Typography>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Street Address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="City"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            label="State"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Zipcode"
                                            name="zipcode"
                                            value={formData.zipcode}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Continue'}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        )
                        : (<form onSubmit={handleStep2Submit}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <Typography variant="h6" className="mb-4">
                                            Contact Information
                                        </Typography>
                                    </Grid>

                                    {formData.companyName && (
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" className="mb-2">
                                                Matched with buyer: {formData.companyName}
                                            </Typography>
                                        </Grid>
                                    )}

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="First Name"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Last Name"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading ? 'Submitting...' : 'Submit'}
                                        </Button>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={() => {
                                                setStep(1);
                                            }}
                                        >
                                            Back
                                        </Button>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="textSecondary">
                                            By submitting your information, you consent to receive phone calls and text
                                            messages from our local home-buying
                                            partner, <strong>{formData.companyName || 'our partner'}</strong>, including
                                            through automated technology. Consent is not required as a condition of
                                            purchase and can be revoked at any time by texting STOP. Message and data
                                            rates may apply.
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </form>
                        )}
            </Paper>
        </div>
    );
};

export default LeadForm;