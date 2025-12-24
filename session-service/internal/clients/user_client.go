package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type UserClient struct {
    BaseURL   string
    AdminJWT  string
    InternalToken string
}

type UserResponse struct {
    ID       uint `json:"id"`
    CupCount int  `json:"cup_count"`
    Role     string `json:"role"`
}

func NewUserClient() *UserClient {
	fmt.Println("USER_SERVICE_URL =", os.Getenv("USER_SERVICE_URL"))
	fmt.Println("ADMIN_JWT_TOKEN =", os.Getenv("ADMIN_JWT_TOKEN"))
    return &UserClient{
        BaseURL:        os.Getenv("USER_SERVICE_URL"),            // url user-service http://localhost:8080
        AdminJWT:       os.Getenv("ADMIN_JWT_TOKEN"),             // admin jwt token
        //InternalToken:  os.Getenv("INTERNAL_API_TOKEN"),          // super_secret_token_123
    }
}

// ---------------- GET USER ------------------

func (c *UserClient) GetUser(id uint) (*UserResponse, error) {
    url := fmt.Sprintf("%s/users/%d", c.BaseURL, id)

    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Authorization", "Bearer "+c.AdminJWT)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        return nil, fmt.Errorf("user-service returned %d", resp.StatusCode)
    }

    var data UserResponse
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        return nil, err
    }

    return &data, nil
}

// ---------------- CHANGE CUPS ------------------

func (c *UserClient) ChangeCups(id uint, diff int) error {
    url := fmt.Sprintf("%s/users/%d/cups", c.BaseURL, id)

    body := map[string]int{"cup_change": diff}
    jsonBody, _ := json.Marshal(body)

    req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    //req.Header.Add("INTERNAL_API_TOKEN", c.InternalToken)
	req.Header.Set("Authorization", "Bearer "+c.AdminJWT)

	client := &http.Client{
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            return http.ErrUseLastResponse
        },
    }

	// --- Логирование URL и headers ---
    fmt.Println("User Service URL:", url)
    fmt.Println("Headers:")
    for k, v := range req.Header {
        fmt.Printf("  %s: %s\n", k, v)
    }
    fmt.Println("Body:", string(jsonBody))
    // -----------------------------------

	fmt.Println("Request method:", req.Method)
	fmt.Println("Request URL:", req.URL.String())

    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode != 200 {
        respBody, _ := io.ReadAll(resp.Body)
        fmt.Println("User Service response:", string(respBody))
        return fmt.Errorf("failed to update cups, status %d", resp.StatusCode)
    }

    return nil
}