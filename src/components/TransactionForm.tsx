// Update the handleSubmit function to include total_amount calculation

handleSubmit = (event) => {
    event.preventDefault();
    // Existing code...
    const total_amount = Number(formData.quantity) * Number(formData.unit_price);
    // Add total_amount to the data being submitted
    const submitData = {
        ...formData,
        total_amount,
    };
    // Continue with the submission
};
