/*
  Self-Employed Deduction Calculator
  Based on the IRS Publication 560 self-employed rate and deduction worksheet structure.

  Important:
  - Step 2 is intentionally collected from the taxpayer's Schedule 1, line 15.
  - The calculator does not try to reconstruct Schedule SE from incomplete inputs.
  - Whole-number plan rates use the IRS Rate Table.
  - Other rates use the IRS Rate Worksheet formula and round to 3 decimal places.
*/

(function () {
  "use strict";

  const LIMITS = {
    2024: {
      compensation: 345000,
      definedContribution: 69000,
      electiveDeferral: 23000,
      catchup: 7500,
      higherCatchup: null
    },
    2025: {
      compensation: 350000,
      definedContribution: 70000,
      electiveDeferral: 23500,
      catchup: 7500,
      higherCatchup: 11250
    },
    2026: {
      compensation: 360000,
      definedContribution: 72000,
      electiveDeferral: 24500,
      catchup: 8000,
      higherCatchup: 11250
    }
  };

  // IRS Rate Table for whole-number plan contribution rates.
  const IRS_RATE_TABLE = {
    1: 0.009901,
    2: 0.019608,
    3: 0.029126,
    4: 0.038462,
    5: 0.047619,
    6: 0.056604,
    7: 0.065421,
    8: 0.074074,
    9: 0.082569,
    10: 0.090909,
    11: 0.099099,
    12: 0.107143,
    13: 0.115044,
    14: 0.122807,
    15: 0.130435,
    16: 0.137931,
    17: 0.145299,
    18: 0.152542,
    19: 0.159664,
    20: 0.166667,
    21: 0.173554,
    22: 0.180328,
    23: 0.186992,
    24: 0.193548,
    25: 0.200000
  };

  const $ = (id) => document.getElementById(id);

  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Math.max(0, Number(value) || 0));

  const decimal = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });

  const wholeNumber = (value) =>
    Number(value || 0).toLocaleString("en-US", {
      maximumFractionDigits: 0
    });

  function value(id) {
    const n = parseFloat($(id).value);
    return Number.isFinite(n) ? n : 0;
  }

  function showError(message) {
    $("errorBox").textContent = message;
    $("errorBox").style.display = "block";
  }

  function clearError() {
    $("errorBox").style.display = "none";
    $("errorBox").textContent = "";
  }

  function getSelfEmployedRate(planRatePercent) {
    const whole = Number.isInteger(planRatePercent);

    if (whole && IRS_RATE_TABLE[planRatePercent]) {
      return {
        rate: IRS_RATE_TABLE[planRatePercent],
        source: "IRS Rate Table"
      };
    }

    const r = planRatePercent / 100;
    const raw = r / (1 + r);

    // IRS worksheet says rounded to at least 3 decimal places.
    const rounded = Math.round(raw * 1000) / 1000;

    return {
      rate: rounded,
      source: "IRS Rate Worksheet"
    };
  }

  function setYearText() {
    const year = $("taxYear").value;
    const L = LIMITS[year];

    $("yearHelp").textContent =
      `${year}: ${money(L.definedContribution)} defined-contribution limit and ${money(L.compensation)} maximum compensation.`;

    $("deferralHelp").textContent =
      `${year} elective-deferral limit: ${money(L.electiveDeferral)}.`;

    if (L.higherCatchup) {
      $("catchupHelp").textContent =
        `${year}: general catch-up ${money(L.catchup)}; higher age 60–63 catch-up ${money(L.higherCatchup)}.`;
    } else {
      $("catchupHelp").textContent =
        `${year}: general catch-up limit ${money(L.catchup)}. The special age 60–63 higher limit does not apply to this year.`;
    }
  }

  function validate() {
    const year = $("taxYear").value;
    const netProfit = value("netProfit");
    const planRate = value("planRate");
    const seTaxDeduction = value("seTaxDeduction");

    if (netProfit <= 0) {
      return "Enter your net business profit. This is used for Step 1.";
    }

    if (planRate <= 0 || planRate > 25) {
      return "Enter a plan contribution rate greater than 0% and no more than 25%.";
    }

    if (seTaxDeduction < 0) {
      return "Enter a valid deduction for one-half of self-employment tax.";
    }

    if (seTaxDeduction > netProfit) {
      return "The Step 2 deduction cannot be greater than the Step 1 net profit.";
    }

    if ($("hasDeferrals").checked) {
      const deferrals = value("electiveDeferrals");
      const roth = value("rothContributions");

      if (deferrals < 0 || roth < 0) {
        return "Enter valid elective-deferral and Roth contribution amounts.";
      }

      if (roth > deferrals) {
        return "Designated Roth contributions included in Step 9 cannot be greater than your elective deferrals.";
      }
    }

    if ($("hasCatchup").checked) {
      const age = value("age");
      const catchup = value("catchupContributions");

      if (age < 50 || age > 120) {
        return "Catch-up contributions require an age of 50 or older for this calculator.";
      }

      if (catchup < 0) {
        return "Enter a valid catch-up contribution amount.";
      }
    }

    return null;
  }

  function buildSteps(data) {
    const {
      L, step1, step2, step3, step4, step5, step6, step7, step8,
      hasDeferrals, step9, step10, step11, step12, step13,
      step14, step15, hasCatchup, step16, step17, step18,
      step19, step20, step21
    } = data;

    const rows = [
      ["Step 1", "Net profit from self-employment", money(step1)],
      ["Step 2", "Deduction for self-employment tax from Schedule 1, line 15", money(step2)],
      ["Step 3", "Step 1 − Step 2: net earnings from self-employment", money(step3)],
      ["Step 4", "Self-employed rate", decimal(step4)],
      ["Step 5", "Step 3 × Step 4", money(step5)],
      ["Step 6", `${money(L.compensation)} × original plan contribution rate`, money(step6)],
      ["Step 7", "Smaller of Step 5 or Step 6", money(step7)],
      ["Step 8", "Contribution dollar limit", money(step8)]
    ];

    if (!hasDeferrals) {
      rows.push(
        ["Steps 9–20", "Skipped because no elective deferrals were entered", "—"],
        ["Step 21", "Smaller of Step 7 or Step 8: maximum deductible contribution", money(step21)]
      );
      return rows;
    }

    rows.push(
      ["Step 9", `Allowable elective deferrals, capped at ${money(L.electiveDeferral)}`, money(step9)],
      ["Step 10", "Step 8 − Step 9", money(step10)],
      ["Step 11", "Step 3 − Step 9", money(step11)],
      ["Step 12", "One-half of Step 11", money(step12)],
      ["Step 13", "Smallest of Step 7, Step 10, or Step 12", money(step13)],
      ["Step 14", "Step 3 − Step 13", money(step14)],
      ["Step 15", "Smaller of Step 9 or Step 14", money(step15)]
    );

    if (hasCatchup) {
      rows.push(
        ["Step 16", "Step 14 − Step 15", money(step16)],
        ["Step 17", "Catch-up contributions, subject to applicable limit", money(step17)],
        ["Step 18", "Smaller of Step 16 or Step 17", money(step18)]
      );
    } else {
      rows.push(["Steps 16–18", "Skipped because no catch-up contributions were entered", "—"]);
    }

    rows.push(
      ["Step 19", "Step 13 + Step 15 + Step 18", money(step19)],
      ["Step 20", "Designated Roth contributions included in Steps 9 and 17", money(step20)],
      ["Step 21", "Step 19 − Step 20: maximum deductible contribution", money(step21)]
    );

    return rows;
  }

  function renderSteps(rows) {
    $("steps").innerHTML = rows.map(([number, description, result]) => `
      <div class="step">
        <div class="num">${number}</div>
        <div class="desc">${description}</div>
        <div class="value">${result}</div>
      </div>
    `).join("");
  }

  function calculate() {
    clearError();

    const error = validate();
    if (error) {
      showError(error);
      return;
    }

    const year = $("taxYear").value;
    const L = LIMITS[year];

    const step1 = value("netProfit");
    const step2 = value("seTaxDeduction");
    const planRatePercent = value("planRate");

    const rateInfo = getSelfEmployedRate(planRatePercent);
    const step4 = rateInfo.rate;

    const step3 = Math.max(0, step1 - step2);
    const step5 = Math.round(step3 * step4);
    const step6 = Math.round(L.compensation * (planRatePercent / 100));
    const step7 = Math.min(step5, step6);
    const step8 = L.definedContribution;

    const hasDeferrals = $("hasDeferrals").checked;
    const hasCatchup = $("hasCatchup").checked;

    let step9 = 0;
    let step10 = 0;
    let step11 = 0;
    let step12 = 0;
    let step13 = 0;
    let step14 = 0;
    let step15 = 0;
    let step16 = 0;
    let step17 = 0;
    let step18 = 0;
    let step19 = 0;
    let step20 = 0;
    let step21 = Math.min(step7, step8);

    if (hasDeferrals) {
      const enteredDeferrals = value("electiveDeferrals");
      const enteredRoth = value("rothContributions");

      step9 = Math.min(enteredDeferrals, L.electiveDeferral);
      step10 = Math.max(0, step8 - step9);
      step11 = Math.max(0, step3 - step9);
      step12 = step11 / 2;
      step13 = Math.min(step7, step10, step12);
      step14 = Math.max(0, step3 - step13);
      step15 = Math.min(step9, step14);

      if (hasCatchup) {
        const age = value("age");
        const enteredCatchup = value("catchupContributions");
        let catchupLimit = L.catchup;

        if (L.higherCatchup && age >= 60 && age <= 63) {
          catchupLimit = L.higherCatchup;
        }

        step16 = Math.max(0, step14 - step15);
        step17 = Math.min(enteredCatchup, catchupLimit);
        step18 = Math.min(step16, step17);
      }

      step19 = step13 + step15 + step18;
      step20 = Math.min(enteredRoth, step9 + step17);
      step21 = Math.max(0, step19 - step20);
    }

    $("maximumDeduction").textContent = money(step21);
    $("resultPlanRate").textContent = `${planRatePercent}%`;
    $("resultSelfRate").textContent = decimal(step4);
    $("resultNetEarnings").textContent = money(step3);

    $("rateDecimal").textContent = decimal(planRatePercent / 100);
    $("ratePlusOne").textContent = decimal(1 + (planRatePercent / 100));
    $("rateResult").textContent = decimal(step4);

    $("resultSummary").textContent =
      `For tax year ${year}, the calculator applied the IRS self-employed rate and deduction worksheet sequence using the information you entered.`;

    renderSteps(buildSteps({
      L, step1, step2, step3, step4, step5, step6, step7, step8,
      hasDeferrals, step9, step10, step11, step12, step13,
      step14, step15, hasCatchup, step16, step17, step18,
      step19, step20, step21
    }));

    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    $("netProfit").value = "";
    $("planRate").value = "";
    $("seTaxDeduction").value = "";
    $("hasDeferrals").checked = false;
    $("hasCatchup").checked = false;
    $("electiveDeferrals").value = "0";
    $("rothContributions").value = "0";
    $("catchupContributions").value = "0";
    $("age").value = "";

    $("deferralPanel").classList.add("hidden");
    $("catchupPanel").classList.add("hidden");
    $("result").classList.add("hidden");
    clearError();
  }

  $("taxYear").addEventListener("change", setYearText);

  $("hasDeferrals").addEventListener("change", function () {
    $("deferralPanel").classList.toggle("hidden", !this.checked);

    if (!this.checked) {
      $("hasCatchup").checked = false;
      $("catchupPanel").classList.add("hidden");
    }
  });

  $("hasCatchup").addEventListener("change", function () {
    if (!this.checked && $("hasDeferrals").checked) {
      $("catchupPanel").classList.add("hidden");
    } else if (this.checked) {
      $("deferralPanel").classList.remove("hidden");
      $("catchupPanel").classList.remove("hidden");
    }
  });

  $("calculateBtn").addEventListener("click", calculate);
  $("resetBtn").addEventListener("click", reset);
  $("printBtn").addEventListener("click", () => window.print());

  $("footerYear").textContent = new Date().getFullYear();
  setYearText();

  // Helpful local/XAMPP diagnostic:
  console.log("Self-Employed Deduction Calculator: scripts.js loaded successfully.");
})();
