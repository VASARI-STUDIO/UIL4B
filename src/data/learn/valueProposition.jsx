// Article: Improving your value proposition. Metadata in src/data/learnIndex.js, sources in src/data/learn/sources.js.
//
// Every study, figure and rule below is cited in the text by author and year,
// and the same name opens the matching entry in the article's source list.
// Nothing here is measured on the page: this article reports other people's
// results, so where a result is weaker than the version usually repeated, the
// prose says so. A sentence with no author and year is general knowledge or the
// article's own reasoning.
//
// Prose only, no expression containers: scripts/learn-wordcount.mjs and the
// Learn search both read the text out of this file.

import { Aside } from '../../components/LearnParts'

export default function ValueProposition() {
  return (
    <>
      <section id="evidence">
        <h2>What the research supports</h2>
        <p>
          A value proposition says what a product does for a person and why they
          should believe it. Behavioural research is often used to polish that
          message. Most of it is real. Much of it is smaller and more
          conditional than the blog version.
        </p>
        <p>
          This guide covers fourteen ideas. Each one has the same four parts:
          what it is, what the evidence shows, how products use it, and how to
          use it honestly. Where the evidence is weaker than the popular claim,
          the guide says so plainly.
        </p>
        <h3>Strongest to weakest</h3>
        <ul>
          <li>
            <b>Strongest.</b> Defaults, and the published minimum sizes for
            touch targets.
          </li>
          <li>
            <b>Strong.</b> Anchoring on numbers people compare against, and
            framing in risky choices. Both have been repeated and combined across
            many studies.
          </li>
          <li>
            <b>Modest.</b> Reviews and popularity information. The average effect
            is small, and it is larger at visible thresholds.
          </li>
          <li>
            <b>Mixed.</b> Loss aversion (its size is argued over), scarcity cues,
            the IKEA effect and banner blindness.
          </li>
          <li>
            <b>Weak or contested.</b> Decoy options, choice overload, and
            the idea that a nicer look makes a product easier to use.
          </li>
          <li>
            <b>No lift found.</b> Countdown timers, in the one independent test
            of them.
          </li>
        </ul>
        <p>
          Nearly all of this work was done in labs, shops and mailings, not on
          software pages. No independent test was found for most of the
          patterns on a SaaS pricing page, such as badges, tier counts, timers or
          logo strips. Treat each idea as a hypothesis to test, not a rule.
        </p>
        <h3>An order of work</h3>
        <ol>
          <li>
            Fix truth and access first. Remove any number, deadline, review or
            &ldquo;was&rdquo; price that is not true. Meet the target-size and
            contrast floors.
          </li>
          <li>
            Name the person&rsquo;s decision and what blocks it. They may not
            understand the value, may not trust it, may not find the action, or
            may not be able to finish setup.
          </li>
          <li>
            Pick the idea that fits that block. Prefer the stronger one when two
            fit.
          </li>
          <li>
            Write the hypothesis, then test it on real traffic. With low
            traffic, say the effect cannot be detected.
          </li>
          <li>
            Apply one ethical test: would it still work if the person could see
            how and why it was built?
          </li>
        </ol>
      </section>

      <section id="value-and-pricing">
        <h2>Value and pricing</h2>
        <p>
          These seven ideas shape how worth is judged: what people value, what
          number they compare against, and how a choice is described.
        </p>

        <h3>The IKEA effect</h3>
        <p>
          <b>What it is.</b> People value something they built more than the
          same thing built by someone else. Norton, Mochon and Ariely (2012)
          found that people paid more for their own folded paper and assembled
          boxes, and rated them close to expert work.
        </p>
        <p>
          <b>The evidence.</b> It only works when the build is finished. A
          failed or unfinished build earns nothing. Children show the effect from
          about age five, and effort did not change it (Marsh, Kanngiesser and
          Hood 2018). That weakens the simple story that effort creates love for
          the result. The studies tested people building a whole object, not
          taking a quiz or ticking options. No source shows that a short
          configurator creates the effect.
        </p>
        <p>
          <b>How products use it.</b> Setup quizzes and product builders are
          common. No outcome data were found, so it is unknown whether they work
          through ownership or just through personalisation.
        </p>
        <p>
          <b>Using it honestly.</b> Let someone finish something small and real
          early, such as a first saved project, rather than a long setup that
          may stall. Make sure they can leave with their work.
        </p>

        <h3>Anchoring</h3>
        <p>
          <b>What it is.</b> A number seen first pulls later estimates towards
          it. Estate agents were swayed by a listing price as much as students
          were, although the agents denied it (Northcraft and Neale 1987).
        </p>
        <p>
          <b>The evidence.</b> For numbers people compare against, it is one of
          the strongest findings in decision research. A review of 2,601 effect
          sizes found a large average effect, with wide variation between
          studies (Schley and Weingarten), and a large replication project
          repeated the classic results (Klein and others 2014). For random
          numbers it is contested. Ariely, Loewenstein and Prelec (2003) found
          large effects. Fudenberg, Levine and Maniadis (2012) found very weak
          ones for ordinary goods. Nobody has measured it for pricing-page
          layouts, such as tier order or struck-through prices.
        </p>
        <p>
          <b>How products use it.</b> Struck-through prices, &ldquo;save
          25%&rdquo; annual toggles and a high custom tier beside the middle
          tiers are common. When J.C. Penney dropped reference prices, comparable
          sales fell 25.2% (JCK 2013). Many things changed at once, so that is a
          hint, not proof.
        </p>
        <p>
          <b>Using it honestly.</b> Quote your real full-scope price first, with
          a reason. If a client names a budget first, treat it as an anchor and
          ask about scope before you reply. A reference price must be one you
          have really charged.
        </p>

        <h3>The decoy effect</h3>
        <p>
          <b>What it is.</b> Adding a clearly worse third option can lift the
          share of the option it is worse than (Huber, Payne and Puto 1982).
          Most tiered pricing pages instead rely on the compromise effect, where
          the middle option gains, and on a &ldquo;most popular&rdquo; badge.
        </p>
        <p>
          <b>The evidence.</b> It is weak outside tidy numeric choices. Across 91
          attempts in 23 product classes, only 11 effects were reliable (Yang and
          Lynn 2014). It largely disappeared when options differed on perception
          or had been experienced (Frederick, Lee and Baskin 2014). A test with
          films found exactly zero while meeting the original authors&rsquo;
          conditions (Trendl, Stewart and Mullett 2021). The best-known
          demonstration, a magazine subscription table, comes from a popular
          book and a student sample, not a journal. Badges are separate. Showing
          the five most popular dishes lifted demand 13 to 20% in a restaurant
          trial, but the popularity was real and the badge design was not tested
          (Cai, Chen and Fang 2009).
        </p>
        <p>
          <b>How products use it.</b> Three or four tiers with a badge on a
          middle tier is the usual pattern. True dominated options are rare.
        </p>
        <p>
          <b>Using it honestly.</b> Offer one recommended package and give a
          reason, such as &ldquo;most clients your size choose this because...&rdquo;.
          Keep it true and check it against real sales. A small business with a
          few enquiries a month cannot detect a decoy effect.
        </p>

        <h3>Framing</h3>
        <p>
          <b>What it is.</b> The same facts, described differently, can change a
          choice. In the Asian disease problem, about 72% chose the certain
          option when it was framed as lives saved, and 22% when it was framed
          as deaths (Tversky and Kahneman 1981).
        </p>
        <p>
          <b>The evidence.</b> Framing in risky choices is strong and has been
          repeated many times (Kühberger 1998, 136 studies). Framing in
          persuasive messages is not. Across large reviews, gain-framed and
          loss-framed messages differ by almost nothing (O&rsquo;Keefe and
          Jensen). So &ldquo;loss wording always beats gain wording&rdquo; is not
          supported, and neither is the reverse.
        </p>
        <p>
          <b>How products use it.</b> Prompts such as &ldquo;keep your
          spot&rdquo; and expiring credits are common. None has an independent
          measurement.
        </p>
        <p>
          <b>Using it honestly.</b> State what the buyer gets and what staying as
          they are costs, in their own numbers, once. With enough traffic, test
          two honest versions of one sentence. Do not assume a frame wins.
        </p>

        <h3>Loss aversion</h3>
        <p>
          <b>What it is.</b> A loss often feels bigger than an equal gain. The
          popular line is that people fear losses &ldquo;twice as much&rdquo;.
        </p>
        <p>
          <b>The evidence.</b> A review of 607 estimates from 150 articles found
          an average of about 1.96 (Brown and others 2024). That is an average
          over mostly money choices, not a constant. Later analyses put it lower,
          and its size is still argued over. Gal and Rucker (2018) say the
          evidence does not show that losses outweigh gains overall. Mrkva and
          others (2020, 17,720 people) found the effect at every knowledge level,
          but smaller for experts.
        </p>
        <p>
          <b>How products use it.</b> Duolingo says it uses loss aversion in
          streaks. Its blog reports a 0.38% rise in daily learners from two
          Streak Freezes, and that learners with a seven-day streak are 3.6 times
          more likely to finish a course (Duolingo 2022). Both figures come from
          the company, the second is a correlation, and the post does not link
          either to loss aversion.
        </p>
        <p>
          <b>Using it honestly.</b> Describe real stakes. Ask of your own habits
          what you would choose if you were starting today, because a tool you
          have used for years feels expensive to drop.
        </p>

        <h3>Scarcity</h3>
        <p>
          <b>What it is.</b> Limited things seem more desirable. There are three
          kinds: limited supply (&ldquo;only 3 left&rdquo;), high demand
          (&ldquo;selling fast&rdquo;) and limited time (&ldquo;ends
          Friday&rdquo;).
        </p>
        <p>
          <b>The evidence.</b> Cookies in scarce supply were rated more
          desirable, but those were ratings from 200 people, not purchases
          (Worchel, Lee and Adewole 1975). A review of 131 studies found that
          scarcity cues generally raise purchase intention. Demand cues did best
          for practical goods, supply cues for experiences and time cues for
          high-involvement purchases (Barton, Zlatevska and Oppewal 2022). The
          one independent test of a 60-second countdown timer found no
          significant effect on whether people accepted a paid add-on (Luguri and
          Strahilevitz 2021). Nothing about scarcity is automatic.
        </p>
        <p>
          <b>How products use it.</b> Real limits are common and lawful, such as
          cohort start dates, seat caps and genuine end dates. Fake versions are
          well documented. A study of about 11,000 shopping sites found 183
          using deceptive patterns, including countdown timers that reset on
          reload and low-stock notices that kept coming back (Mathur and others
          2019).
        </p>
        <p>
          <b>Using it honestly.</b> Use only real limits and write them in text:
          &ldquo;two places left in the October cohort&rdquo;. For a freelancer
          the real scarcity is capacity, and saying so is honest.
        </p>

        <h3>The endowment effect</h3>
        <p>
          <b>What it is.</b> People ask more to give up something they hold than
          they would pay to get it. In the classic mug study, sellers wanted a
          median of about US$7 and buyers offered about US$3 (Kahneman, Knetsch
          and Thaler 1990).
        </p>
        <p>
          <b>The evidence.</b> The gap is solid in the lab. A review found
          selling prices above buying prices (Yechiam, Ashby and Pachur 2017).
          The cause is contested. Gal and Rucker (2018) argue it is inertia, not
          loss aversion. No study measured it in a software trial. The best field
          evidence is about inertia. In a newspaper experiment, auto-renewing
          trials produced about 20% more subscriptions and 21% more revenue after
          four months. Auto-cancel did better after a year, the advantage was gone
          at two years, and about half of auto-renewers paid for something they
          did not want to use (Sahni, Miller and Strulov-Shlain). A test of
          three-day against seven-day trials, with 680,588 users, changed trial
          adoption and delayed conversion but not immediate conversion (Zhang and
          Duan 2025).
        </p>
        <p>
          <b>How products use it.</b> Free trials and freemium plans are often
          said to &ldquo;create ownership&rdquo;. The evidence points more to
          inertia.
        </p>
        <p>
          <b>Using it honestly.</b> Put real value in the person&rsquo;s hands
          early, such as their own project, not a demo. Judge a trial by revenue
          kept at six to twelve months, not by sign-ups. Send the end-of-trial
          reminder yourself.
        </p>
      </section>

      <section id="trust-and-defaults">
        <h2>Trust and defaults</h2>
        <p>
          These three ideas are about whom people believe and what they do when
          they do nothing.
        </p>

        <h3>Social proof</h3>
        <p>
          <b>What it is.</b> When unsure, people treat what others do and say as
          evidence. It is strongest when the situation is unclear and the others
          are similar.
        </p>
        <p>
          <b>The evidence.</b> Reviews matter, modestly. An extra half star made
          restaurants sell out 19 points (49%) more often, and more so where
          other information was scarce (Anderson and Magruder 2012). Across 96
          studies the link between reviews and sales averaged 0.091, and the
          number of reviews counted for more than the average rating (Babić
          Rosario and others 2016). A single artificial up-vote raised later
          positive ratings by 32% in a news-site test (Muchnik, Aral and Taylor
          2013). Other findings are weaker. A hotel card saying other guests reuse
          towels lifted reuse from 35.1% to 44.1% (Goldstein, Cialdini and
          Griskevicius 2008), but a later re-analysis found the pooled towel
          results inflated (Carlsson and others). Norms can also backfire.
          Telling households the average pushed low energy users up (Schultz and
          others 2007). In vendor-partnered data, purchase likelihood peaked at
          4.2 to 4.5 stars, not 5.0 (Spiegel Research Center 2021).
        </p>
        <p>
          <b>How products use it.</b> Logo strips, &ldquo;join 10,000
          teams&rdquo; counts and &ldquo;most popular&rdquo; badges are standard.
          No independent measurement was found. Lift figures quoted by testing
          vendors are not planning inputs.
        </p>
        <p>
          <b>Using it honestly.</b> Use proof that can be checked: named
          customers with permission, real counts, dated reviews, a mix of
          ratings. With few reviews, show the honest number. Put a specific quote
          that answers the visitor&rsquo;s objection next to the decision. Ask
          every customer for a review the same way, not only happy ones.
        </p>

        <h3>The halo effect</h3>
        <p>
          <b>What it is.</b> One good impression leaks into judgements of
          unrelated traits, often without the judge noticing. Viewers of a warm
          lecturer rated his accent as appealing and denied that liking him had
          influenced them (Nisbett and Wilson 1977). In interfaces the form is
          the aesthetic-usability effect: attractive designs are rated easier to
          use.
        </p>
        <p>
          <b>The evidence.</b> The halo exists. The direction of cause is
          disputed. Across 26 cash-machine layouts and 252 people, appeal
          matched perceived ease of use more than actual ease of use (Kurosu and
          Kashimura 1995, reported by Moran 2024). One study found beauty shaped
          perceived usability (Tractinsky, Katz and Ikar 2000). A later one, with
          80 people, found usability shaped perceived beauty and not the reverse
          (Tuch and others 2012). Polish is a first impression, not a substitute
          for usability.
        </p>
        <p>
          <b>How products use it.</b> Polished brand surfaces, big-name customers
          and press logos borrow the halo. No independently measured case was
          found.
        </p>
        <p>
          <b>Using it honestly.</b> Fix first-impression defects first, such as
          spelling, broken layout and mismatched type. In usability tests, measure
          task success, not liking. When you judge a vendor or tool, score each
          criterion on its own before forming an overall view.
        </p>

        <h3>Status quo bias and defaults</h3>
        <p>
          <b>What it is.</b> People keep what they already have, and accept
          whatever is pre-selected (Samuelson and Zeckhauser 1988). A default
          works through effort, through the sense that it is recommended, and
          through being treated as the current state.
        </p>
        <p>
          <b>The evidence.</b> This is the most credible effect in this guide. A
          review of 58 studies and 73,675 people found a medium-to-large effect
          (d = 0.68), stronger in consumer choices and when the default signals
          endorsement (Jachimowicz and others 2019). Automatic enrolment raised
          retirement-plan participation from 37% to 86% for staff with 3 to 15
          months of service (Madrian and Shea 2001). Real-world nudges are
          smaller than published ones (1.4 against 8.7 percentage points across
          126 trials), though defaults are among the more credible kinds
          (DellaVigna and Linos 2022). Arguing that a buyer&rsquo;s current routine
          is costly is a different tactic, with no review behind it. It can be
          honest if the cost is real and you quantify it.
        </p>
        <p>
          <b>How products use it.</b> Search and browser defaults, notification
          and permission prompts, auto-renewing subscriptions, pre-selected plans
          and add-ons, and privacy settings.
        </p>
        <p>
          <b>Using it honestly.</b> Set the default to what you would choose for a
          typical person, and make &ldquo;change this&rdquo; easy to see. Prefer
          safe, reversible defaults. A default is a decision made for someone
          else, so be ready to explain it.
        </p>
      </section>

      <section id="interface-laws">
        <h2>Choice and interface laws</h2>
        <p>
          These four are the best known &ldquo;laws&rdquo; in interface design.
          Each was measured on something simpler than a web page.
        </p>

        <h3>Hick&rsquo;s law</h3>
        <p>
          <b>What it is.</b> In simple tasks, reaction time rises with the
          logarithm of the number of equally likely choices (Proctor and
          Schneider 2018). It is often stretched into &ldquo;fewer options are
          better&rdquo;. A second finding, choice overload, travels with it.
        </p>
        <p>
          <b>The evidence.</b> Hick&rsquo;s law holds for reaction time to
          lamps and keys, with known exceptions. It grows slowly. Cutting a 40-item menu to 35 changes log2(41), about 5.36
          bits, to log2(36), about 5.17. For interfaces it is contested. Liu and
          others (2020) argue the law speaks against &ldquo;less is
          better&rdquo;. Choice overload is shakier. The jam study found 24 jams
          drew more shoppers, but only about 3% of those who stopped bought,
          against 30% at a table of 6 (Iyengar and Lepper 2000). That was one
          shop over two Saturdays. A review of 50 experiments found an average
          effect of virtually zero (Scheibehenne, Greifeneder and Todd 2010). A
          later review found overload when sets are complex, tasks are hard or
          preferences are unclear (Chernev, Böckenholt and Goodman 2015).
        </p>
        <p>
          <b>How products use it.</b> Pricing pages show two to four tiers, and
          wizards, quizzes and filters narrow choices. No independent test of tier
          count was found.
        </p>
        <p>
          <b>Using it honestly.</b> Use the law as a prompt to structure, not to
          delete. Group, order predictably, label in the person&rsquo;s words and
          add search to long lists. Keep one primary action per screen. Where
          buyers are unsure, reduce, group and recommend with a reason. Always
          offer a way to see everything.
        </p>

        <h3>Fitts&rsquo;s law</h3>
        <p>
          <b>What it is.</b> The farther away and smaller a target is, the longer
          it takes to point at, in proportion to the logarithm of distance over
          width (Fitts 1954).
        </p>
        <p>
          <b>The evidence.</b> It is strong for aimed pointing. On touch screens
          the plain law underestimates errors on small targets, and a modified
          model fitted far better (Bi, Li and Zhai 2013). No independent test was
          found showing that a bigger button lifts sales. The solid part is the
          published minimum sizes: 24 by 24 CSS pixels with spacing at WCAG 2.2
          level AA (SC 2.5.8), 44 by 44 at level AAA (SC 2.5.5), 44 by 44 points
          for Apple, and 48 by 48 dp with 8 dp between targets for Android.
          Spacing matters as much as size, because neighbours cause errors.
        </p>
        <p>
          <b>How products use it.</b> The real use is platform guidance from
          Apple, Google and the W3C. These are standards, not conversion claims.
        </p>
        <p>
          <b>Using it honestly.</b> Make every tappable control at least 44 by 44
          pixels, and enlarge hit areas with padding that does not change the
          look. Put the main action where the thumb or pointer already is, at the
          end of the content it concludes. Keep close, dismiss and destructive
          controls away from it.
        </p>

        <h3>The Von Restorff effect</h3>
        <p>
          <b>What it is.</b> An item that differs from its neighbours is
          remembered better than the same item in a uniform list (Hunt 1995,
          on von Restorff&rsquo;s original work).
        </p>
        <p>
          <b>The evidence.</b> The memory effect is strong in the lab. Making a
          button stand out draws on a different field, visual attention, where a
          single item that differs on a basic feature is found quickly
          (Treisman and Gelade 1980; Theeuwes 1992). The much-retold test where a
          red button beat a green one by 21% used about 2,000 visits, and the page
          was already green, so red was simply the only contrasting item. The
          original post could not be found (Porter 2011, as retold by Poper).
          Emphasis also works only while it is rare.
        </p>
        <p>
          <b>How products use it.</b> Pricing pages isolate the recommended plan
          with a tag, a border or a filled button while the others are outlined.
          No data show whether it lifts revenue.
        </p>
        <p>
          <b>Using it honestly.</b> Give each view one primary action in one
          accent colour used nowhere else. On a value-proposition page, make the
          single key claim the odd one out in size and weight. Squint at the page
          to check, and run a real contrast check, because colour cannot be the
          only cue.
        </p>

        <h3>Banner blindness</h3>
        <p>
          <b>What it is.</b> People on a task skip areas that look like adverts,
          by position (top strips, right-hand rails) or by look. They also skip
          useful content placed there.
        </p>
        <p>
          <b>The evidence.</b> The direction has held for two decades. An
          eye-tracking study with 26 people found users skipped content in
          ad-like zones, content that looked like an ad wherever it sat, and
          legitimate content next to ads (Pernice 2018). The size depends on the
          task. Goal-directed searchers recalled 0.06 banners on average, against
          1.00 for aimless browsers (Pagendarm and Schaumburg 2001, 32 students).
          Blind means not attending during the task, not never looking.
        </p>
        <p>
          <b>How products use it.</b> Companies mostly work around it, with
          native ads, &ldquo;sponsored&rdquo; results, and product messages placed
          inside the main modal, not in banner strips.
        </p>
        <p>
          <b>Using it honestly.</b> Put the value proposition in the main reading
          flow as plain text. Keep the only copy of anything important, such as
          price changes, outages and terms, out of announcement bars and
          ad-shaped boxes. Place trust and pricing details beside the content
          they qualify.
        </p>
      </section>

      <section id="dark-patterns">
        <h2>Where each idea becomes a dark pattern</h2>
        <p>
          A technique is honest when the claim is true and the choice stays free
          and informed. It becomes a dark pattern when it relies on a false claim,
          a hidden fact, or making the person&rsquo;s preferred option harder to
          take than yours. These patterns are common. A sweep of about 11,000
          shopping sites found 1,818 instances (Mathur and others 2019). In an
          experiment, mild patterns lifted acceptance of a paid plan from 11.3% to
          25.8%, and aggressive ones to 41.9%, but aggressive ones also caused
          backlash. A countdown timer alone did nothing (Luguri and Strahilevitz
          2021).
        </p>
        <Aside>
          This is a summary, not legal advice. Laws change and the rules differ by
          country, so read the current text for the places you sell in. Where a
          rule has not started yet, it says so.
        </Aside>

        <h3>Fake urgency and fake scarcity</h3>
        <p>
          This is where scarcity, framing and loss aversion turn. Examples are a
          timer that resets, a deadline that rolls over, invented stock or demand,
          and &ldquo;your spot is held&rdquo; when nothing is held.
        </p>
        <ul>
          <li>
            <b>Australia (ACCC).</b> The Australian Consumer Law already bans
            misleading conduct and false representations (sections 18 and 29).
            Emma Sleep was penalised A$15m in April 2026, partly for countdown
            timers that reset. Vuly and James Lane paid infringement notices over
            Black Friday 2025 deadlines.
          </li>
          <li>
            <b>United States (FTC).</b> The FTC Act bans deceptive practices. The
            FTC&rsquo;s 2022 staff report on dark patterns lists fake countdown
            clocks and false low-stock or high-demand messages.
          </li>
          <li>
            <b>European Union.</b> The Unfair Commercial Practices Directive bans
            false &ldquo;very limited time&rdquo; claims (Annex I, point 7).
          </li>
          <li>
            <b>United Kingdom.</b> The Digital Markets, Competition and Consumers
            Act bans false limited-time claims. Official guidance (CMA207) names a
            restarting countdown clock as a false time limit and says a genuine
            end is unlikely to be a problem.
          </li>
        </ul>

        <h3>Fake &ldquo;was&rdquo; prices</h3>
        <p>
          This is where anchoring turns: a reference price the business never
          charged.
        </p>
        <ul>
          <li>
            <b>Australia.</b> Of Emma Sleep&rsquo;s 74 products, 58 never sold at
            the struck-through price and 16 almost never did.
          </li>
          <li>
            <b>United States.</b> The FTC&rsquo;s pricing guides require a former
            price to be genuine (16 CFR Part 233).
          </li>
          <li>
            <b>European Union.</b> A price cut must show the lowest price of the
            prior 30 days.
          </li>
          <li>
            <b>United Kingdom.</b> The government was consulting on rules for
            &ldquo;was&rdquo; prices. Check the current position.
          </li>
        </ul>

        <h3>Fake or gated proof, and fake awards</h3>
        <p>
          This is where social proof and the halo turn: invented reviews, bought
          followers, &ldquo;N people viewing&rdquo; counters that are not real,
          hidden bad reviews, and fake &ldquo;as seen in&rdquo; logos. No law
          targets good-looking design. The target is the false claim.
        </p>
        <ul>
          <li>
            <b>Australia.</b> Service Seeking paid A$600,000 after businesses wrote
            their own reviews. HealthEngine paid A$2.9m after about 17,000
            negative reviews went unpublished.
          </li>
          <li>
            <b>United States.</b> The FTC rule on consumer reviews and
            testimonials took effect on 21 October 2024. It bans fake and
            AI-generated reviews, undisclosed insider reviews, review suppression
            and fake follower counts, with penalties of up to US$53,088 per
            violation.
          </li>
          <li>
            <b>European Union.</b> Annex I, points 23b and 23c, ban claiming
            reviews are from real users without reasonable checks.
          </li>
          <li>
            <b>United Kingdom.</b> Fake and undisclosed-incentive reviews have
            been banned since 6 April 2025.
          </li>
        </ul>

        <h3>Drip pricing and decoys no one can buy</h3>
        <p>
          Charm prices are lawful. The problem is a low headline price with
          mandatory fees added later. A decoy nobody can actually buy is bait
          advertising.
        </p>
        <ul>
          <li>
            <b>Australia.</b> Drip-pricing disclosure rules start on 1 July 2027.
            The Federal Court found eHarmony misled customers with &ldquo;from&rdquo;
            monthly prices that left out a mandatory fee.
          </li>
          <li>
            <b>European Union.</b> Bait advertising is banned (Annex I, points 5
            and 6).
          </li>
          <li>
            <b>United Kingdom.</b> Drip pricing has been banned since 6 April
            2025.
          </li>
        </ul>

        <h3>Trials and defaults that trap</h3>
        <p>
          This is where defaults, endowment and the IKEA effect turn: pre-ticked
          boxes, pre-selected paid add-ons, hidden auto-renewal, and cancelling
          that is harder than joining.
        </p>
        <ul>
          <li>
            <b>Australia.</b> Subscription duties on disclosure, reminders and
            online cancellation start on 1 July 2027.
          </li>
          <li>
            <b>United States.</b> Amazon agreed in September 2025 to pay US$1bn
            plus US$1.5bn in refunds over Prime sign-up and cancellation, and to
            offer a clear decline button. The federal click-to-cancel rule was
            struck down in July 2025, and a new rulemaking is under way.
          </li>
          <li>
            <b>European Union.</b> A pre-ticked box is not valid consent (the
            Planet49 case, 2019).
          </li>
          <li>
            <b>United Kingdom.</b> A subscription regime is due from January 2027.
          </li>
        </ul>

        <h3>Hidden choices and shaming buttons</h3>
        <p>
          This is where Hick&rsquo;s law, Fitts&rsquo;s law, the Von Restorff
          effect and banner blindness turn. Examples are a tiny, pale decline
          button beside a large &ldquo;keep&rdquo; button, a cheapest plan buried
          in clutter, and decline wording written to make the reader feel foolish for
          saying no. Disguised ads, built to look like part
          of the interface, belong here too.
        </p>
        <ul>
          <li>
            <b>Australia.</b> A general ban on conduct that unreasonably
            manipulates consumers starts on 1 July 2027. No court has read it yet.
            The maximum penalty is already the greater of A$100m, three times the
            benefit, or 30% of adjusted turnover.
          </li>
          <li>
            <b>United States.</b> The FTC Act applies, and the Amazon order
            requires a clear decline option.
          </li>
          <li>
            <b>European Union.</b> The Digital Services Act, Article 25, bars
            online platforms from deceptive or manipulative interfaces. Misleading
            prominence, repeated requests and hard cancellation are listed as
            topics for guidelines. It covers platforms only.
          </li>
          <li>
            <b>United Kingdom.</b> Rules on aggressive and misleading practices
            are likely to apply, though no rule names these designs.
          </li>
        </ul>

        <h3>Seven rules of practice</h3>
        <ol>
          <li>Every number, deadline, stock level, rating and &ldquo;was&rdquo; price must be true when it is shown.</li>
          <li>Show the total price, including mandatory fees, with the headline price.</li>
          <li>Make cancelling as easy as joining, and remind people before a trial turns into a charge.</li>
          <li>Never pre-tick consent or paid add-ons.</li>
          <li>Invite reviews from every customer the same way. Disclose incentives. Do not edit, hide or gate reviews.</li>
          <li>Give &ldquo;yes&rdquo; and &ldquo;no&rdquo; equal weight, in plain words that do not shame.</li>
          <li>In health, therapeutic and finance work, check the sector rules as well.</li>
        </ol>
        <p>
          The shortest test applies to every idea above. Would the design still
          work if the person could see exactly how and why it was built?
        </p>
      </section>
    </>
  )
}
