// API service functions
const api = {
    post: async (url, data) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    }
};

// Lead service functions
const leadService = {
    async pingLead(leadData) {
        const leadWithCampaignKey = {
            ...leadData,
            campaign_key: 'import.meta.env.VITE_CAMPAIGN_KEY'
        };

        return await api.post('http://localhost:5005/api/leads/ping', leadWithCampaignKey);
    },

    async postLead(pingId, contactData, oldDatabase = false) {
        return await api.post(
            `/api/leads/post/${pingId}`,
            contactData
        );
    }
};

const LeadForm = () => {
    const [step, setStep] = React.useState(1);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [formData, setFormData] = React.useState({
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

    const handleChange = (event) => {
        const {name, value} = event.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleStep1Submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare data for ping request
            const pingData = {
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zipcode: formData.zipcode
            };

            // Make the ping request
            const response = await leadService.pingLead(pingData);

            // Update form data with response
            setFormData(prev => ({
                ...prev,
                pingId: response.ping_id,
                companyName: response.company_name
            }));

            setStep(2);
        } catch (error) {
            console.error('Ping lead error:', error);
            setError(error.message || 'Failed to process property information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2Submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare contact data for submission
            const contactData = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                email: formData.email
            };

            // Submit the lead
            const response = await leadService.postLead(formData.pingId, contactData);

            if (response.success) {
                setSuccess(true);
            } else {
                throw new Error('Lead submission failed');
            }
        } catch (error) {
            console.error('Post lead error:', error);
            setError(error.message || 'Failed to submit lead information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSuccess(false);
        setError('');
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
            pingId: '',
        });
    };

    return (
        <div className="lead-form-container">
            <div className="lead-form-card">
                {error && <div className="error-message">{error}</div>}
                {success
                    ? (
                        <div>
                            <h2 className="text-center">🎉 Success!</h2>
                            <p className="text-center">The lead has been successfully submitted.</p>
                            <button
                                onClick={resetForm}
                                className="submit-button"
                            >
                                Submit Another Lead
                            </button>
                        </div>
                    )
                    : step === 1
                        ? (
                            <form onSubmit={handleStep1Submit}>
                                <h2>Property Information</h2>
                                <input
                                    className="form-input"
                                    placeholder="Street Address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                />
                                <div className="form-row">
                                    <input
                                        className="form-input"
                                        placeholder="City"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="State"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <input
                                    className="form-input"
                                    placeholder="Zipcode"
                                    name="zipcode"
                                    value={formData.zipcode}
                                    onChange={handleChange}
                                    required
                                />
                                <button type="submit" disabled={loading} className="submit-button">
                                    {loading ? 'Processing...' : 'Continue'}
                                </button>
                            </form>
                        )
                        : (
                            <form onSubmit={handleStep2Submit}>
                                <h2>Contact Information</h2>
                                {formData.companyName && (
                                    <p>Matched with buyer: {formData.companyName}</p>
                                )}
                                <input
                                    className="form-input"
                                    placeholder="First Name"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    className="form-input"
                                    placeholder="Last Name"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="Email Address"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    className="form-input"
                                    type="tel"
                                    placeholder="Phone Number"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                                <button type="submit" disabled={loading} className="submit-button">
                                    {loading ? 'Submitting...' : 'Submit'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="back-button"
                                >
                                    Back
                                </button>
                                <p className="consent-text">
                                    By submitting your information, you consent to receive phone calls and
                                    text messages from our local home-buying
                                    partner, <strong>{formData.companyName || 'our partner'}</strong>,
                                    including through automated technology.
                                    Consent is not required as a condition of purchase and can be revoked at
                                    any time by texting STOP.
                                    Message and data rates may apply.
                                </p>
                            </form>
                        )}
            </div>
        </div>
    );
};