package code.guru;

import org.junit.Test;

import static org.junit.Assert.assertNotNull;

public class ScannerServiceTest {
    @Test
    public void appHasAGreeting() {
        ScannerService classUnderTest = new ScannerService();
        assertNotNull("app should have a greeting", classUnderTest.getGreeting());
    }
}
