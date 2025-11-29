// Split content into sections
export const formatContent = (text) => {
    // Split by numbered lists (1. 2. 3. etc.)
    const parts = text.split(/(\d+\.\s)/);
    const elements = [];

    let currentList = [];
    let currentText = '';

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (/^\d+\.\s$/.test(part)) {
            // This is a number marker
            if (currentText.trim()) {
                elements.push(<p key={`p-${i}`} className="mb-3 text-gray-800">{currentText.trim()}</p>);
                currentText = '';
            }

            if (i + 1 < parts.length) {
                currentList.push(parts[i + 1]);
                i++; // Skip next part as we've used it
            }
        } else if (!part.match(/^\d+\.\s$/)) {
            if (currentList.length > 0) {
                // Render the list
                elements.push(
                    <ol key={`ol-${i}`} className="mb-4 ml-4 space-y-2">
                        {currentList.map((item, idx) => (
                            <li key={idx} className="text-gray-800 leading-relaxed">{item.trim()}</li>
                        ))}
                    </ol>
                );
                currentList = [];
            }
            currentText += part;
        }
    }

    // Handle remaining content
    if (currentList.length > 0) {
        elements.push(
            <ol key="ol-final" className="mb-4 ml-4 space-y-2">
                {currentList.map((item, idx) => (
                    <li key={idx} className="text-gray-800 leading-relaxed">{item.trim()}</li>
                ))}
            </ol>
        );
    }

    if (currentText.trim()) {
        elements.push(<p key="p-final" className="mb-3 text-gray-800">{currentText.trim()}</p>);
    }

    return elements;
};