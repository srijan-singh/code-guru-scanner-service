package code.guru;

public class ScannerService {

    public String getGreeting() {
        return "Hello World!";
    }

    public static void main(String[] args) {
        System.out.println(new ScannerService().getGreeting());
    }
}

